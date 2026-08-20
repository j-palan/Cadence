import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { PROVIDERS, isValidPair, modelsFor, type ProviderId } from '@/lib/ai/catalog'
import { encryptSecret, keyHint } from '@/lib/ai/crypto'
import { verifyCredentials } from '@/lib/ai/providers'
import {
  clearAiCredentials,
  getAiCredentials,
  saveAiCredentials,
  setAiEnabled,
  setAiModel,
} from '@/lib/db/queries'

// Verification makes a real round-trip to the provider.
export const maxDuration = 60

const saveSchema = z.object({
  provider: z.enum(PROVIDERS),
  model: z.string().min(1).max(120),
  // Long enough for any provider's format; the provider is the real validator.
  apiKey: z.string().trim().min(16).max(400),
})

const patchSchema = z.union([
  z.object({ enabled: z.boolean() }),
  z.object({ model: z.string().min(1).max(120) }),
])

/**
 * Store and verify a user's own API key.
 *
 * The key is verified against the provider before anything is written, then
 * encrypted at rest. It is never returned — responses carry only the last four
 * characters, and nothing here is logged.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const parsed = saveSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Pick a model and paste a key.' }, { status: 400 })
  }

  const { provider, model, apiKey } = parsed.data
  if (!isValidPair(provider, model)) {
    return NextResponse.json(
      { error: `${model} is not one of the ${provider} models Cadence supports.` },
      { status: 400 },
    )
  }

  const check = await verifyCredentials(provider, model, apiKey)
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 })
  }

  const saved = await saveAiCredentials(session.user.id, {
    provider,
    model,
    keyCipher: encryptSecret(apiKey),
    keyHint: keyHint(apiKey),
  })
  if (!saved) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  return NextResponse.json({ enabled: true, provider, model, keyHint: keyHint(apiKey) })
}

/** Toggle own-key generation on or off, or switch model within the provider. */
export async function PATCH(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const existing = await getAiCredentials(session.user.id)
  if (!existing) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const body = parsed.data

  if ('enabled' in body) {
    // Turning it on needs a stored key to turn on.
    if (body.enabled && !existing.keyCipher) {
      return NextResponse.json({ error: 'Add a key first.' }, { status: 409 })
    }
    await setAiEnabled(session.user.id, body.enabled)
    return NextResponse.json({ enabled: body.enabled })
  }

  // A model switch must stay within the provider the stored key belongs to —
  // an Anthropic key cannot drive a Gemini model.
  const provider = existing.provider as ProviderId | null
  if (!provider || !modelsFor(provider).some((m) => m.id === body.model)) {
    return NextResponse.json(
      { error: 'That model does not match the provider your key is for.' },
      { status: 400 },
    )
  }

  await setAiModel(session.user.id, body.model)
  return NextResponse.json({ model: body.model })
}

/** Forget the key entirely. Generation reverts to Cadence's default. */
export async function DELETE() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const cleared = await clearAiCredentials(session.user.id)
  if (!cleared) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  return NextResponse.json({ enabled: false })
}
