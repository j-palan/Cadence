import { NextResponse } from 'next/server'

import { auth } from '@/auth'
import { deleteUser } from '@/lib/db/queries'

/**
 * Account deletion. One statement — the FK cascades take out accounts,
 * sessions, resumes, and log_imports with the user row.
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const deleted = await deleteUser(session.user.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  // The session row is gone with the user; clear the cookie so the browser
  // stops sending a token that no longer resolves.
  const response = NextResponse.json({ ok: true })
  for (const name of ['authjs.session-token', '__Secure-authjs.session-token']) {
    response.cookies.set({ name, value: '', path: '/', expires: new Date(0) })
  }

  return response
}
