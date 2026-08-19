import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { auth, googleConfigured } from '@/auth'
import { SignInButton } from '@/components/auth/sign-in-button'
import { SiteFooterContent } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

export const metadata: Metadata = { title: 'Sign in' }

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
  // Only same-origin paths, so ?next= cannot become an open redirect.
  const next = searchParams.next?.startsWith('/') ? searchParams.next : '/dashboard'

  if (session?.user) redirect(next)

  const error = searchParams.error
    ? (AUTH_ERRORS[searchParams.error] ?? 'Sign-in failed. Try again.')
    : null

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="flex flex-1 items-center justify-center px-6 pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-display-sm">Sign in</h1>

          {error ? (
            <p className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="mt-8">
            {googleConfigured ? (
              <SignInButton next={next} className="w-full" size="lg" />
            ) : (
              <p className="rounded-lg border border-border bg-card px-3.5 py-3 text-sm leading-relaxed text-muted-foreground">
                Google sign-in is not configured. Set{' '}
                <code className="font-mono text-xs text-foreground">AUTH_GOOGLE_ID</code> and{' '}
                <code className="font-mono text-xs text-foreground">AUTH_GOOGLE_SECRET</code> in{' '}
                <code className="font-mono text-xs text-foreground">.env.local</code>.
              </p>
            )}
          </div>

          <p className="mt-10 text-xs leading-relaxed text-muted-foreground">
            By signing in you agree to the{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-foreground">
              terms
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              privacy policy
            </Link>
            .
          </p>

          <Link
            href="/"
            className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </Link>
        </div>
      </main>

      <SiteFooterContent />
    </div>
  )
}
