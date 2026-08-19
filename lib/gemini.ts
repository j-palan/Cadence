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
 * Gemini 2.5 Flash. Generous free tier, and fast enough that a user watching the
 * stream is not left waiting. Override with GEMINI_MODEL if you want Pro.
 */
export const GENERATION_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'

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

  const stream = await ai.models.generateContentStream({
    model: GENERATION_MODEL,
    contents: buildUserMessage(input),
    config: {
      systemInstruction: SYSTEM_PROMPTS[input.mode],
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      // Low but non-zero: the layout rules need consistent counting, and a
      // resume is not a creative writing task.
      temperature: 0.2,
      // Thinking helps the model hold the bullet-count and page budget. Leave
      // the budget dynamic (-1) and keep the thoughts out of the output.
      thinkingConfig: { thinkingBudget: -1, includeThoughts: false },
    },
  })

  let sawText = false

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
      sawText = true
      yield text
    }
  }

  if (!sawText) {
    throw new Error('Gemini returned an empty response. Try again.')
  }
}

/** Maps SDK errors onto a status code and a message safe to show a user. */
export function describeGenerationError(error: unknown): { status: number; message: string } {
  if (error instanceof MissingApiKeyError) {
    return { status: 503, message: error.message }
  }
  if (error instanceof BlockedError) {
    return { status: 422, message: error.message }
  }
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { status: 503, message: 'The configured Gemini API key was rejected.' }
    }
    if (error.status === 429) {
      return { status: 429, message: 'Gemini rate limit reached. Try again in a moment.' }
    }
    if (error.status === 400) {
      return { status: 400, message: 'The log could not be processed. Try trimming it down.' }
    }
    return { status: 502, message: 'The resume service is unavailable right now.' }
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Resume generation failed.',
  }
}
