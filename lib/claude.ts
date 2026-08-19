import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

import { stripCodeFences } from './latex-client'
import { SYSTEM_PROMPTS, type GenerationMode } from './prompts'

export { stripCodeFences }

// Haiku 4.5. Cheapest and fastest of the current models, which suits a user
// watching a stream. Note it does NOT accept `output_config.effort` — that
// parameter is rejected on this model, so no effort is sent below.
export const GENERATION_MODEL = 'claude-haiku-4-5'

// Streaming, so the HTTP timeout that constrains non-streaming requests does
// not apply. A long log can produce a long document; leave room.
const MAX_TOKENS = 32_000

// Guard rails on input size so one enormous paste cannot run up a bill.
export const MAX_LOG_CHARS = 120_000
export const MAX_EXISTING_SOURCE_CHARS = 120_000
export const MAX_JOB_DESCRIPTION_CHARS = 20_000


let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new MissingApiKeyError()
  }
  client ??= new Anthropic()
  return client
}

export class MissingApiKeyError extends Error {
  constructor() {
    super('ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.')
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
}

function buildUserMessage(input: GenerateResumeInput): string {
  const { mode, log, templateSource, existingSource, jobDescription } = input

  if (mode === 'tailor') {
    return [
      'Here is the job description to tailor toward:',
      `<job_description>
${(jobDescription ?? '').slice(0, MAX_JOB_DESCRIPTION_CHARS)}
</job_description>`,
      '',
      'Here is the resume, which is the source of truth for what this person has actually done:',
      `<resume>
${(existingSource ?? '').slice(0, MAX_EXISTING_SOURCE_CHARS)}
</resume>`,
      '',
      'Return the complete tailored LaTeX document.',
    ].join('\n')
  }

  if (mode === 'update') {
    return [
      "Here is the developer's work log:",
      `<log>
${(log ?? '').slice(0, MAX_LOG_CHARS)}
</log>`,
      '',
      'Here is their current resume, which is the source of truth. Merge in anything the log adds and leave everything else exactly as it is:',
      `<resume>
${(existingSource ?? '').slice(0, MAX_EXISTING_SOURCE_CHARS)}
</resume>`,
      '',
      'Return the complete updated LaTeX document.',
    ].join('\n')
  }

  return [
    "Here is a developer's work log:",
    `<log>
${(log ?? '').slice(0, MAX_LOG_CHARS)}
</log>`,
    '',
    'Here is the LaTeX resume template to fill:',
    `<template>
${templateSource ?? ''}
</template>`,
    '',
    'Return the complete LaTeX document.',
  ].join('\n')
}


/**
 * Stream a generated LaTeX resume as plain text chunks.
 *
 * Only `text_delta` events are forwarded, so any thinking the model does stays
 * out of the editor. The caller strips code fences from the assembled result —
 * a fence cannot be caught mid-stream.
 */
export async function* streamResumeSource(
  input: GenerateResumeInput,
): AsyncGenerator<string, void, unknown> {
  const anthropic = getClient()

  const stream = anthropic.messages.stream({
    model: GENERATION_MODEL,
    max_tokens: MAX_TOKENS,
    // No `output_config.effort` and no `thinking`: effort is rejected on Haiku
    // 4.5, and this is a well-specified transformation that does not need it.
    system: SYSTEM_PROMPTS[input.mode],
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }

  const final = await stream.finalMessage()
  if (final.stop_reason === 'refusal') {
    throw new Error(
      `The model declined to generate this resume (${final.stop_details?.category ?? 'unspecified'}).`,
    )
  }
}

/** Maps SDK errors onto a status code and a message safe to show a user. */
export function describeClaudeError(error: unknown): { status: number; message: string } {
  if (error instanceof MissingApiKeyError) {
    return { status: 503, message: error.message }
  }
  if (error instanceof Anthropic.AuthenticationError) {
    return { status: 503, message: 'The configured Anthropic API key was rejected.' }
  }
  if (error instanceof Anthropic.RateLimitError) {
    return { status: 429, message: 'Anthropic rate limit reached. Try again in a moment.' }
  }
  if (error instanceof Anthropic.BadRequestError) {
    return { status: 400, message: 'The log could not be processed. Try trimming it down.' }
  }
  if (error instanceof Anthropic.APIError) {
    return { status: 502, message: 'The resume service is unavailable right now.' }
  }
  return {
    status: 500,
    message: error instanceof Error ? error.message : 'Resume generation failed.',
  }
}
