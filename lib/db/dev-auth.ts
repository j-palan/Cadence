import 'server-only'

import { eq } from 'drizzle-orm'

import { db } from './index'
import { sessions, users } from './schema'

/**
 * Backing store for the development-only sign-in route.
 *
 * Credentials providers cannot be used with database sessions in Auth.js v5, so
 * the local escape hatch writes a session row itself. This file is the only
 * place that does — everything else goes through queries.ts.
 */

const SESSION_DAYS = 30

export async function createDevSession(email: string): Promise<{
  sessionToken: string
  expires: Date
  userId: string
}> {
  const normalized = email.trim().toLowerCase()

  const [existing] = await db.select().from(users).where(eq(users.email, normalized)).limit(1)

  const user =
    existing ??
    (
      await db
        .insert(users)
        .values({
          email: normalized,
          name: normalized.split('@')[0],
          emailVerified: new Date(),
        })
        .returning()
    )[0]

  const sessionToken = crypto.randomUUID()
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({ sessionToken, userId: user.id, expires })

  return { sessionToken, expires, userId: user.id }
}
