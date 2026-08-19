import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createDevSession } from '@/lib/db/dev-auth'

/**
 * Local sign-in without Google.
 *
 * Double-gated: it 404s unless NODE_ENV is not production AND AUTH_DEV_LOGIN is
 * the literal string "true". Deploying with the flag on would let anyone sign in
 * as anyone, so the production check is not the flag alone.
 */
const enabled =
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true'

const bodySchema = z.object({ email: z.string().email().max(320) })

export async function POST(request: Request) {
  if (!enabled) {
    return new NextResponse('Not found', { status: 404 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })
  }

  const { sessionToken, expires } = await createDevSession(parsed.data.email)

  const response = NextResponse.json({ ok: true })
  response.cookies.set({
    name: 'authjs.session-token',
    value: sessionToken,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    expires,
  })

  return response
}
