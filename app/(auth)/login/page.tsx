import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { auth, googleConfigured } from '@/auth'
import { DevSignIn } from '@/components/auth/dev-sign-in'
import { SignInButton } from '@/components/auth/sign-in-button'

export const metadata: Metadata = { title: 'Sign in' }

const devLoginEnabled =
  process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_LOGIN === 'true'

const AUTH_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked: 'That email is already registered with a different sign-in method.',
  AccessDenied: 'Google sign-in was cancelled.',
  Configuration: 'Google sign-in is not configured on this server.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string }
}) {
  const session = await auth()
  // Only allow same-origin paths through, so ?next= cannot become an open redirect.
  const next = searchParams.next?.startsWith('/') ? searchParams.next : '/dashboard'

  if (session?.user) redirect(next)

  const error = searchParams.error
    ? (AUTH_ERRORS[searchParams.error] ?? 'Sign-in failed. Try again.')
    : null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <Link href="/" className="inline-flex font-mono text-sm font-medium tracking-tight">
            cadence
          </Link>
          <h1 className="text-xl font-medium tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Google only. No password to set, nothing to reset.
          </p>
        </div>

        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="space-y-4">
          {googleConfigured ? (
            <SignInButton next={next} className="w-full" size="lg" />
          ) : (
            <p className="rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
              Google sign-in is not configured. Set{' '}
              <code className="text-xs">AUTH_GOOGLE_ID</code> and{' '}
              <code className="text-xs">AUTH_GOOGLE_SECRET</code> in{' '}
              <code className="text-xs">.env.local</code>.
            </p>
          )}

          {devLoginEnabled ? <DevSignIn next={next} /> : null}
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          By signing in you agree to the{' '}
          <Link href="/terms" className="underline hover:text-foreground">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline hover:text-foreground">
            privacy policy
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
