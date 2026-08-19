import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * A cheap cookie-presence check, plus the current path as a header.
 *
 * Sessions live in the database, which the edge runtime cannot reach, so this
 * cannot and does not authorize anything. It exists to bounce obviously
 * signed-out visitors before a server component renders. The real
 * authorization is the `await auth()` call in `app/(app)/layout.tsx` and in
 * every route handler.
 */
const SESSION_COOKIES = ['authjs.session-token', '__Secure-authjs.session-token']

/** Server components cannot read the pathname; the protected layout needs it. */
export const PATHNAME_HEADER = 'x-cadence-pathname'

export function middleware(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) => request.cookies.has(name))

  if (!hasSessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  const headers = new Headers(request.headers)
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/dashboard/:path*', '/resume/:path*', '/onboarding', '/settings'],
}
