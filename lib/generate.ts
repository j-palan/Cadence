import 'server-only'

import { resolveEngine, NoCredentialsError, type ResolvedEngine } from './ai/engine'
import {
  BlockedError,
  EmptyResponseError,
  ProviderError,
  streamFrom,
} from './ai/providers'
import { stripCodeFences } from './latex-client'
import {
  MAX_CUSTOM_INSTRUCTIONS_CHARS,
  SYSTEM_PROMPTS,
  buildInstructionBlock,
  type GenerationMode,
} from './prompts'

export { stripCodeFences, resolveEngine }
export type { ResolvedEngine }

// Streaming, so the HTTP timeout that constrains a single response does not
// apply. A long log can produce a long document; leave room.
const MAX_TOKENS = 32_768

// Guard rails on input size so one enormous paste cannot run up a bill.
export const MAX_LOG_CHARS = 120_000
export const MAX_EXISTING_SOURCE_CHARS = 120_000
export const MAX_JOB_DESCRIPTION_CHARS = 20_000
export { MAX_CUSTOM_INSTRUCTIONS_CHARS }

const MAX_ATTEMPTS = 2
const BASE_BACKOFF_MS = 700
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

/**
 * Fallback models, tried only when the request is running on Cadence's own key.
 *
 * A user's own key is never silently redirected to a different model — they
 * chose it, and it is their bill. The free Gemini tier, by contrast, returns
 * 503 often enough that a second choice is the difference between a working
 * feature and an intermittent one.
 */
const DEFAULT_FALLBACKS = ['gemini-3.7-flash', 'gemini-3.5-flash', 'gemini-flash-latest']

/**
 * Stream a generated LaTeX resume as plain text chunks.
 *
 * The caller strips code fences from the assembled result — a fence cannot be
 * caught mid-stream.
 */
export async function* streamResumeSource(
  input: GenerateResumeInput,
  engine: ResolvedEngine,
): AsyncGenerator<string, void, unknown> {
  const system = SYSTEM_PROMPTS[input.mode]
  const user = buildUserMessage(input)
  const models = engine.ownKey ? [engine.model] : [...new Set([engine.model, ...DEFAULT_FALLBACKS])]

  let lastError: unknown = null

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      // Once a byte reaches the caller the attempt is committed: restarting
      // would duplicate the document, so the error must propagate.
      let committed = false

      try {
        for await (const chunk of streamFrom({
          provider: engine.provider,
          model,
          apiKey: engine.apiKey,
          system,
          user,
          maxTokens: MAX_TOKENS,
        })) {
          if (chunk) {
            committed = true
            yield chunk
          }
        }

        if (!committed) throw new EmptyResponseError()
        if (model !== engine.model) console.warn(`[generate] served by fallback model ${model}`)
        return
      } catch (error) {
        if (committed) throw error
        lastError = error

        const retryable =
          (error instanceof ProviderError && error.retryable) || error instanceof EmptyResponseError
        if (!retryable) throw error

        if (attempt === MAX_ATTEMPTS - 1) {
          console.warn(`[generate] ${model} unavailable; moving on`)
          break
        }
        await sleep(BASE_BACKOFF_MS * 2 ** attempt)
      }
    }
  }

  throw lastError ?? new Error('Resume generation failed.')
}

/** Maps errors onto a status code and a message safe to show a user. */
export function describeGenerationError(error: unknown): { status: number; message: string } {
  if (error instanceof NoCredentialsError) return { status: 503, message: error.message }
  if (error instanceof BlockedError) return { status: 422, message: error.message }
  if (error instanceof EmptyResponseError) {
    return { status: 502, message: 'The model returned nothing. Try again.' }
  }
  if (error instanceof ProviderError) return { status: error.status, message: error.message }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Resume generation failed.',
  }
}
