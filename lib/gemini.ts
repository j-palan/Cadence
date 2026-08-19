import 'server-only'

import { ApiError, GoogleGenAI } from '@google/genai'

import { stripCodeFences } from './latex-client'
import {
  MAX_CUSTOM_INSTRUCTIONS_CHARS,
  SYSTEM_PROMPTS,
  buildInstructionBlock,
  type GenerationMode,
} from './prompts'

export { stripCodeFences }

/**
 * Gemini 3.6 Flash: what the API's own 404 message recommends, and the model
 * that actually had capacity in testing. 3.7-flash is newer but returns 503
 * "experiencing high demand" often enough that leading with it just buys a
 * couple of wasted retries. Override with GEMINI_MODEL for Pro.
 *
 * Pinned rather than using the `gemini-flash-latest` alias: the layout rules are
 * tuned against a specific model, and an alias can move under you. Note that
 * `models.list()` still advertises retired models — 2.5-flash lists fine but
 * returns 404 on generation for new keys — so verify by generating, not listing.
 */
export const GENERATION_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

/**
 * Models tried in order. The free tier returns 503 "experiencing high demand"
 * on the newest models fairly often, so a second and third choice is the
 * difference between a working feature and an intermittent one.
 */
const MODEL_CHAIN = [
  ...new Set([GENERATION_MODEL, 'gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest']),
]

const MAX_ATTEMPTS_PER_MODEL = 2
const BASE_BACKOFF_MS = 700

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Transient: worth retrying the same model after a short wait. */
function isTransient(error: unknown): boolean {
  return error instanceof ApiError && [429, 500, 502, 503, 504].includes(error.status)
}

/** The model itself is gone or misnamed — move down the chain immediately. */
function isModelGone(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}

// Streaming, so the HTTP timeout that constrains a single response does not
// apply. A long log can produce a long document; leave room.
const MAX_OUTPUT_TOKENS = 32_768

// Guard rails on input size so one enormous paste cannot run up a bill.
export const MAX_LOG_CHARS = 120_000
export const MAX_EXISTING_SOURCE_CHARS = 120_000
export const MAX_JOB_DESCRIPTION_CHARS = 20_000
export { MAX_CUSTOM_INSTRUCTIONS_CHARS }

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new MissingApiKeyError()

  // The Gemini Developer API (an AI Studio key) is the free path. A key scoped to
  // Vertex instead needs { vertexai: true, project, location } — set
  // GEMINI_VERTEX_LOCATION to switch, since the project is already configured.
  const location = process.env.GEMINI_VERTEX_LOCATION
  const project = process.env.GEMINI_PROJECT_NUMBER

  client ??= location
    ? new GoogleGenAI({ vertexai: true, project, location })
    : new GoogleGenAI({ apiKey })

  return client
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('GEMINI_API_KEY is not set. Add it to .env.local and restart the dev server.')
    this.name = 'MissingApiKeyError'
  }
}

export interface GenerateResumeInput {
  mode: GenerationMode
  /** Required for `create` and `update`. */
  log?: string
  /** The template, for `create`. */
  templateSource?: string
  /** The saved resume — the source of truth for `update` and `tailor`. */
  existingSource?: string | null
  /** Required for `tailor`. */
  jobDescription?: string
  /** The user's own instructions for this run. Overrides the layout defaults. */
  customInstructions?: string | null
}

function buildUserMessage(input: GenerateResumeInput): string {
  const { mode, log, templateSource, existingSource, jobDescription } = input
  const instructions = buildInstructionBlock(input.customInstructions)

  if (mode === 'tailor') {
    return [
      'Here is the job description to tailor toward:',
      `<job_description>\n${(jobDescription ?? '').slice(0, MAX_JOB_DESCRIPTION_CHARS)}\n</job_description>`,
      '',
      'Here is the resume, which is the source of truth for what this person has actually done:',
      `<resume>\n${(existingSource ?? '').slice(0, MAX_EXISTING_SOURCE_CHARS)}\n</resume>`,
      '',
      'Return the complete tailored LaTeX document.',
      instructions,
    ].join('\n')
  }

  if (mode === 'update') {
    return [
      "Here is the developer's work log:",
      `<log>\n${(log ?? '').slice(0, MAX_LOG_CHARS)}\n</log>`,
      '',
      'Here is their current resume, which is the source of truth. Merge in anything the log adds and leave everything else exactly as it is:',
      `<resume>\n${(existingSource ?? '').slice(0, MAX_EXISTING_SOURCE_CHARS)}\n</resume>`,
      '',
      'Return the complete updated LaTeX document.',
      instructions,
    ].join('\n')
  }

  return [
    "Here is a developer's work log:",
    `<log>\n${(log ?? '').slice(0, MAX_LOG_CHARS)}\n</log>`,
    '',
    'Here is the LaTeX resume template to fill:',
    `<template>\n${templateSource ?? ''}\n</template>`,
    '',
    'Return the complete LaTeX document.',
    instructions,
  ].join('\n')
}

/** Raised when the model streams nothing at all — retryable. */
export class EmptyResponseError extends Error {
  constructor() {
    super('Gemini returned an empty response.')
    this.name = 'EmptyResponseError'
  }
}

/** Raised when a safety filter stops the request or the response. */
export class BlockedError extends Error {
  constructor(reason: string) {
    super(`Gemini declined this request (${reason}).`)
    this.name = 'BlockedError'
  }
}

/**
 * Stream a generated LaTeX resume as plain text chunks.
 *
 * The caller strips code fences from the assembled result — a fence cannot be
 * caught mid-stream.
 */
export async function* streamResumeSource(
  input: GenerateResumeInput,
): AsyncGenerator<string, void, unknown> {
  const ai = getClient()
  let lastError: unknown = null

  for (const model of MODEL_CHAIN) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_MODEL; attempt += 1) {
      // Once a byte has been handed to the caller the attempt is committed:
      // restarting would duplicate the document, so the error must propagate.
      let committed = false

      try {
        const stream = await ai.models.generateContentStream({
          model,
          contents: buildUserMessage(input),
          config: {
            systemInstruction: SYSTEM_PROMPTS[input.mode],
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            // Low but non-zero: the layout rules need consistent counting, and a
            // resume is not a creative writing task.
            temperature: 0.2,
            // Thinking helps the model hold the bullet-count and page budget.
            // Dynamic budget, thoughts excluded from the output.
            thinkingConfig: { thinkingBudget: -1, includeThoughts: false },
          },
        })

        for await (const chunk of stream) {
          // A prompt-level block arrives with no candidates at all.
          const blockReason = chunk.promptFeedback?.blockReason
          if (blockReason) throw new BlockedError(blockReason)

          const finish = chunk.candidates?.[0]?.finishReason
          if (finish && !['STOP', 'MAX_TOKENS', 'FINISH_REASON_UNSPECIFIED'].includes(finish)) {
            throw new BlockedError(finish)
          }

          const text = chunk.text
          if (text) {
            committed = true
            yield text
          }
        }

        if (!committed) throw new EmptyResponseError()
        if (model !== MODEL_CHAIN[0]) {
          console.warn(`[gemini] served by fallback model ${model}`)
        }
        return
      } catch (error) {
        if (committed) throw error

        lastError = error

        if (isModelGone(error)) {
          console.warn(`[gemini] ${model} returned 404; trying the next model`)
          break
        }

        if (!isTransient(error) && !(error instanceof EmptyResponseError)) throw error

        const isLastTry = attempt === MAX_ATTEMPTS_PER_MODEL - 1
        if (isLastTry) {
          console.warn(`[gemini] ${model} unavailable after ${attempt + 1} tries; trying the next model`)
          break
        }

        await sleep(BASE_BACKOFF_MS * 2 ** attempt)
      }
    }
  }

  throw lastError ?? new Error('Resume generation failed.')
}

/** Maps SDK errors onto a status code and a message safe to show a user. */
export function describeGenerationError(error: unknown): { status: number; message: string } {
  if (error instanceof MissingApiKeyError) {
    return { status: 503, message: error.message }
  }
  if (error instanceof BlockedError) {
    return { status: 422, message: error.message }
  }
  if (error instanceof EmptyResponseError) {
    return { status: 502, message: 'Gemini returned nothing. Try again.' }
  }
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { status: 503, message: 'The configured Gemini API key was rejected.' }
    }
    if (error.status === 429) {
      return { status: 429, message: 'Gemini rate limit reached. Try again in a moment.' }
    }
    if ([500, 502, 503, 504].includes(error.status)) {
      // Every model in the chain was busy; genuinely worth trying again shortly.
      return {
        status: 503,
        message: 'Gemini is busy right now. Give it a moment and press Update again.',
      }
    }
    if (error.status === 400) {
      return { status: 400, message: 'The log could not be processed. Try trimming it down.' }
    }
    if (error.status === 404) {
      // Almost always a retired or misspelled model. Name it, so the fix is obvious.
      return {
        status: 503,
        message: `The model "${GENERATION_MODEL}" is not available to this API key. Set GEMINI_MODEL in .env.local to a current model.`,
      }
    }
    return { status: 502, message: 'The resume service is unavailable right now.' }
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Resume generation failed.',
  }
}
