import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * A cheap cookie-presence check, nothing more.
 *
 * Sessions live in the database, which the edge runtime cannot reach, so this
 * cannot and does not authorize anything. It exists to bounce obviously
 * signed-out visitors before a server component renders. The real
 * authorization is `requireUser` / `requireOnboardedUser` in each page, and
 * `await auth()` in every route handler.
 */
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

export function middleware(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name))

  if (hasSessionCookie) return NextResponse.next()

  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('next', request.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: ['/dashboard/:path*', '/resume/:path*', '/onboarding', '/settings'],
}
