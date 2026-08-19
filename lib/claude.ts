import 'server-only'

import Anthropic from '@anthropic-ai/sdk'

// The plan pins Sonnet 5 for generation: resume writing is a well-specified
// transformation, and the price/latency suits a user watching a stream.
export const GENERATION_MODEL = 'claude-sonnet-5'

// Streaming, so the HTTP timeout that constrains non-streaming requests does
// not apply. A long log can produce a long document; leave room.
const MAX_TOKENS = 32_000

// Guard rails on input size so one enormous paste cannot run up a bill.
export const MAX_LOG_CHARS = 120_000
export const MAX_EXISTING_SOURCE_CHARS = 120_000

const SYSTEM_PROMPT = `You are an expert technical resume writer who works directly in LaTeX. You write concise, impact-first bullet points in past tense. Use strong action verbs. Quantify achievements where the log provides data — never invent numbers, employers, dates, degrees, or technologies that are absent from the log.

You are given a complete, working LaTeX resume document filled with example content. Replace the example content with content drawn from the log, and change nothing else:

- Keep the preamble exactly as given: every \\documentclass, \\usepackage, \\newcommand, \\titleformat, and margin adjustment stays byte-for-byte identical.
- Build entries only with the document's own macros (\\resumeSubheading, \\resumeProjectHeading, \\resumeItem, \\resumeItemListStart/End, \\resumeSubHeadingListStart/End). Do not invent new macros or load new packages.
- Repeat or delete entries to match the log. Delete a whole \\section if the log has nothing for it — never leave example content behind.
- The log rarely mentions education or contact details. Keep those sections structurally intact with clearly placeholder values a user can obviously fill in, rather than inventing a school or a phone number.
- Escape LaTeX special characters in prose: & # % $ _ { } become \\& \\# \\% \\$ \\_ \\{ \\}. Write C++ as C\\texttt{++} or C/C++ plainly, and use -- for date ranges.

Output ONLY the complete LaTeX document, starting at \\documentclass and ending at \\end{document}. No markdown fences, no commentary before or after. The output must compile with pdflatex on the first try.`

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
  log: string
  templateSource: string
  existingSource?: string | null
}

function buildUserMessage({
  log,
  templateSource,
  existingSource,
}: GenerateResumeInput): string {
  const parts = [
    "Here is a developer's work log:",
    `<log>\n${log.slice(0, MAX_LOG_CHARS)}\n</log>`,
    '',
    'Here is the LaTeX resume document to fill:',
    `<template>\n${templateSource}\n</template>`,
  ]

  if (existingSource && existingSource.trim().length > 0) {
    parts.push(
      '',
      'Here is their current resume. Merge new accomplishments in; do not remove existing content unless it is duplicated by the log. Preserve their real name, contact details, and education exactly as written:',
      `<current_resume>\n${existingSource.slice(0, MAX_EXISTING_SOURCE_CHARS)}\n</current_resume>`,
      '',
      'Return the complete updated LaTeX document.',
    )
  } else {
    parts.push('', 'Return the complete LaTeX document.')
  }

  return parts.join('\n')
}

/** Strip the ```latex fences a model occasionally wraps its output in. */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:latex|tex)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()
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
    // Resume writing does not need deep deliberation, and the user is watching
    // the stream. Adaptive thinking stays on (the default on Sonnet 5).
    output_config: { effort: 'medium' },
    system: SYSTEM_PROMPT,
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
