import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { auth } from '@/auth'
import { TransformPreview } from '@/components/landing/transform-preview'
import { SiteFooterContent } from '@/components/site-footer'
import { Wordmark } from '@/components/wordmark'
import { Button } from '@/components/ui/button'
import { AGENTS, LOG_PATH } from '@/lib/agents'

const STEPS = [
  {
    title: 'Add one instruction',
    body: `Paste it into your agent's config once. From then on it appends what you ship to ${LOG_PATH}.`,
  },
  {
    title: 'Go code',
    body: 'Your agent writes each win down while the numbers are still in front of it.',
  },
  {
    title: 'Generate and edit',
    body: 'Import the log, get LaTeX, and refine it in a real editor with the PDF beside you.',
  },
]

export default async function LandingPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)
  const appHref = signedIn ? '/dashboard' : '/login'
  const ctaLabel = signedIn ? 'Open dashboard' : 'Get started'

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Wordmark />
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href={appHref}>{signedIn ? 'Dashboard' : 'Sign in'}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero: the claim, then the proof, and nothing else. */}
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <h1 className="text-display max-w-2xl">
            You forgot what you shipped.
            <br />
            <span className="text-muted-foreground">Your agent didn&apos;t.</span>
          </h1>

          <p className="mt-7 max-w-readable text-base leading-relaxed text-muted-foreground sm:text-lg">
            Cadence gives your coding agent one instruction: write down every win as it happens.
            Then it turns that log into a real LaTeX resume.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" block>
              <Link href={appHref}>
                {ctaLabel}
                <ArrowRight />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground sm:ml-2">
              Google sign-in · no password
            </p>
          </div>

          <div className="mt-16 sm:mt-20">
            <TransformPreview />
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
            <h2 className="text-display-sm max-w-md">Set it up once, then forget about it.</h2>

            <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="font-mono text-xs text-success">0{index + 1}</span>
                  <h3 className="mt-3 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Agents: one quiet line, no logo wall. */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-16">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Works with</p>
            <p className="mt-4 font-mono text-sm leading-relaxed text-foreground/80">
              {AGENTS.map((agent) => agent.name).join('  ·  ')}
            </p>
            <p className="mt-4 max-w-readable text-sm text-muted-foreground">
              Any agent that reads an instructions file works — the snippet is plain English, not
              an integration.
            </p>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
            <h2 className="text-display-sm max-w-lg">
              Your next resume is already half-written.
            </h2>
            <div className="mt-9">
              <Button asChild size="lg" block>
                <Link href={appHref}>
                  {ctaLabel}
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooterContent />
    </div>
  )
}
