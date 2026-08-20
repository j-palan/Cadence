import 'server-only'

import Anthropic from '@anthropic-ai/sdk'
import { ApiError, GoogleGenAI } from '@google/genai'

import type { ProviderId } from './catalog'

/**
 * One streaming interface over every provider, so the generation route does not
 * care whose model is behind it.
 *
 * Clients are constructed per call rather than cached: the API key varies by
 * user, and caching by key would mean holding user credentials in module scope.
 */
export interface StreamRequest {
  provider: ProviderId
  model: string
  apiKey: string
  system: string
  user: string
  maxTokens: number
}

export class ProviderError extends Error {
  readonly status: number
  readonly retryable: boolean

  constructor(message: string, status: number, retryable = false) {
    super(message)
    this.name = 'ProviderError'
    this.status = status
    this.retryable = retryable
  }
}

/** Raised when a safety filter stops the request or the response. */
export class BlockedError extends Error {
  constructor(reason: string) {
    super(`The model declined this request (${reason}).`)
    this.name = 'BlockedError'
  }
}

export class EmptyResponseError extends Error {
  constructor() {
    super('The model returned an empty response.')
    this.name = 'EmptyResponseError'
  }
}

const GEMINI_OK_FINISH = ['STOP', 'MAX_TOKENS', 'FINISH_REASON_UNSPECIFIED']

async function* streamGemini(request: StreamRequest): AsyncGenerator<string> {
  const ai = new GoogleGenAI({ apiKey: request.apiKey })

  let stream
  try {
    stream = await ai.models.generateContentStream({
      model: request.model,
      contents: request.user,
      config: {
        systemInstruction: request.system,
        maxOutputTokens: request.maxTokens,
        // Low but non-zero: the layout rules need consistent counting, and a
        // resume is not a creative writing task.
        temperature: 0.2,
        // Thinking helps hold the bullet-count and page budget; thoughts are
        // excluded so they never reach the editor.
        thinkingConfig: { thinkingBudget: -1, includeThoughts: false },
      },
    })
  } catch (error) {
    throw translateGemini(error)
  }

  for await (const chunk of stream) {
    const blockReason = chunk.promptFeedback?.blockReason
    if (blockReason) throw new BlockedError(blockReason)

    const finish = chunk.candidates?.[0]?.finishReason
    if (finish && !GEMINI_OK_FINISH.includes(finish)) throw new BlockedError(finish)

    if (chunk.text) yield chunk.text
  }
}

function translateGemini(error: unknown): Error {
  if (!(error instanceof ApiError)) return error instanceof Error ? error : new Error(String(error))

  if (error.status === 401 || error.status === 403) {
    return new ProviderError('That Gemini API key was rejected.', 400)
  }
  if (error.status === 404) {
    return new ProviderError('That Gemini model is not available to this key.', 400)
  }
  if (error.status === 429) {
    return new ProviderError('Gemini rate limit reached. Try again shortly.', 429, true)
  }
  if ([500, 502, 503, 504].includes(error.status)) {
    return new ProviderError('Gemini is busy right now.', 503, true)
  }
  if (error.status === 400) {
    return new ProviderError('Gemini rejected the request. Try trimming the log.', 400)
  }
  return new ProviderError('Gemini is unavailable right now.', 502, true)
}

async function* streamAnthropic(request: StreamRequest): AsyncGenerator<string> {
  const client = new Anthropic({ apiKey: request.apiKey })

  try {
    // No `thinking` and no `output_config.effort`: omitting both is valid on
    // every model in the catalog, whereas `effort` is rejected on Haiku 4.5.
    const stream = client.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text
      }
    }

    const final = await stream.finalMessage()
    if (final.stop_reason === 'refusal') {
      throw new BlockedError(final.stop_details?.category ?? 'refusal')
    }
  } catch (error) {
    if (error instanceof BlockedError) throw error
    throw translateAnthropic(error)
  }
}

function translateAnthropic(error: unknown): Error {
  if (error instanceof Anthropic.AuthenticationError) {
    return new ProviderError('That Anthropic API key was rejected.', 400)
  }
  if (error instanceof Anthropic.NotFoundError) {
    return new ProviderError('That Claude model is not available to this key.', 400)
  }
  if (error instanceof Anthropic.RateLimitError) {
    return new ProviderError('Anthropic rate limit reached. Try again shortly.', 429, true)
  }
  if (error instanceof Anthropic.BadRequestError) {
    return new ProviderError('Anthropic rejected the request. Try trimming the log.', 400)
  }
  if (error instanceof Anthropic.APIError) {
    const retryable = (error.status ?? 0) >= 500
    return new ProviderError('Anthropic is unavailable right now.', retryable ? 503 : 502, retryable)
  }
  return error instanceof Error ? error : new Error(String(error))
}

export function streamFrom(request: StreamRequest): AsyncGenerator<string> {
  switch (request.provider) {
    case 'anthropic':
      return streamAnthropic(request)
    case 'gemini':
    default:
      return streamGemini(request)
  }
}

/**
 * Cheapest possible round-trip that proves a key works for a model.
 *
 * Run before storing anything, so a typo is caught while the user is still
 * looking at the field rather than on their next generation.
 */
export async function verifyCredentials(
  provider: ProviderId,
  model: string,
  apiKey: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const stream = streamFrom({
      provider,
      model,
      apiKey,
      system: 'Reply with the single word OK.',
      user: 'Reply with the single word OK.',
      maxTokens: 512,
    })

    for await (const chunk of stream) {
      if (chunk.trim()) return { ok: true }
    }
    // Some models spend the whole budget thinking; reaching the end without an
    // error still proves the credential and model are good.
    return { ok: true }
  } catch (error) {
    if (error instanceof ProviderError) return { ok: false, message: error.message }
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not verify that key.',
    }
  }
}
