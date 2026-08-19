import 'server-only'

import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import type { Session } from 'next-auth'

type SessionUser = Session['user']

/**
 * Authorization helpers for pages.
 *
 * These live in *pages*, not in a shared layout. A layout is not re-rendered
 * when navigating between two routes that share it, so a gate placed there is
 * silently skipped on client-side navigation — and redirecting out of a layout
 * that also wraps the redirect target loops forever once Next prefetches a
 * `<Link>` to a gated route.
 *
 * Pages re-render on every navigation, so a gate here always runs.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user) redirect('/login')
  return session.user
}

/**
 * For every page that assumes onboarding is done.
 *
 * Safe against loops by construction: this sends an un-onboarded user to
 * /onboarding, and /onboarding sends an onboarded user here. `onboarded` is a
 * single boolean read fresh from the database, so exactly one of the two can
 * fire for a given user.
 */
export async function requireOnboardedUser(): Promise<SessionUser> {
  const user = await requireUser()
  if (!user.onboarded) redirect('/onboarding')
  return user
}
