import 'server-only'

import { decryptSecret } from './crypto'
import { isValidPair, modelLabel, type ProviderId } from './catalog'
import { getAiCredentials } from '@/lib/db/queries'

/** Resolve only the signed-in user’s saved API credentials. */
export interface ResolvedEngine {
  provider: ProviderId
  model: string
  baseUrl?: string
  apiKey: string
  label: string
}

export class NoCredentialsError extends Error {
  constructor() {
    super(
      'Add and enable your API key in Settings → Model to use AI generation.',
    )
    this.name = 'NoCredentialsError'
  }
}

export async function resolveEngine(userId: string): Promise<ResolvedEngine> {
  const settings = await getAiCredentials(userId)

  if (
    !settings?.enabled ||
    !settings.provider ||
    !settings.model ||
    !settings.keyCipher ||
    (settings.provider === 'other' && !settings.baseUrl) ||
    !isValidPair(settings.provider, settings.model)
  ) {
    throw new NoCredentialsError()
  }

  let apiKey: string
  try {
    apiKey = decryptSecret(settings.keyCipher)
  } catch {
    throw new NoCredentialsError()
  }

  return {
    provider: settings.provider,
    model: settings.model,
    apiKey,
    baseUrl: settings.baseUrl ?? undefined,
    label: modelLabel(settings.model),
  }
}

/** Describes the active engine for display, without touching the key. */
export function describeEngine(engine: ResolvedEngine): string {
  return `${engine.label} (your key)`
}
