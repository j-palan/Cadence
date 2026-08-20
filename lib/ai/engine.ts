import 'server-only'

import { decryptSecret } from './crypto'
import { isValidPair, modelLabel, type ProviderId } from './catalog'
import { getAiCredentials } from '@/lib/db/queries'

/**
 * Which model a given user's request should run on.
 *
 * Own-key settings win when enabled and complete; anything missing or invalid
 * falls back to Cadence's default rather than failing, so a stale or corrupted
 * record can never lock a user out of generating.
 */
export interface ResolvedEngine {
  provider: ProviderId
  model: string
  apiKey: string
  /** True when the user is paying for this call with their own key. */
  ownKey: boolean
  label: string
}

export const DEFAULT_PROVIDER: ProviderId = 'gemini'
export const DEFAULT_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'

export class NoCredentialsError extends Error {
  constructor() {
    super(
      'No API key is configured. Add your own in Settings, or set GEMINI_API_KEY on the server.',
    )
    this.name = 'NoCredentialsError'
  }
}

function defaultEngine(): ResolvedEngine {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new NoCredentialsError()

  return {
    provider: DEFAULT_PROVIDER,
    model: DEFAULT_MODEL,
    apiKey,
    ownKey: false,
    label: modelLabel(DEFAULT_MODEL),
  }
}

export async function resolveEngine(userId: string): Promise<ResolvedEngine> {
  const settings = await getAiCredentials(userId)

  if (
    !settings?.enabled ||
    !settings.provider ||
    !settings.model ||
    !settings.keyCipher ||
    !isValidPair(settings.provider, settings.model)
  ) {
    return defaultEngine()
  }

  let apiKey: string
  try {
    apiKey = decryptSecret(settings.keyCipher)
  } catch {
    // Most likely the encryption secret was rotated. Fall back rather than
    // stranding the user, and let Settings prompt them to re-enter it.
    console.error('[engine] could not decrypt a stored API key; using the default model')
    return defaultEngine()
  }

  return {
    provider: settings.provider,
    model: settings.model,
    apiKey,
    ownKey: true,
    label: modelLabel(settings.model),
  }
}

/** Describes the active engine for display, without touching the key. */
export function describeEngine(engine: ResolvedEngine): string {
  return engine.ownKey ? `${engine.label} (your key)` : `${engine.label} (Cadence's key)`
}
