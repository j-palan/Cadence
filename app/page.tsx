import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'

import { auth } from '@/auth'
import { Faq } from '@/components/landing/faq'
import { FeatureGrid } from '@/components/landing/feature-grid'
import { TransformPreview } from '@/components/landing/transform-preview'
import { JobBoardShowcase } from '@/components/landing/job-board-showcase'
import { JobBoardLink } from '@/components/jobs/job-board-link'
import { Reveal } from '@/components/reveal'
import { SiteFooterContent } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { AGENTS } from '@/lib/agents'

export const metadata: Metadata = {
  description: 'Turn your work into a resume, discover internships on the job board, and compare each role with the skills in your resume.',
  openGraph: {
    title: 'Cadence — build your resume, find your next role',
    description: 'Keep your resume current, explore fresh internship postings, and find roles that match your experience.',
  },
}

export default async function LandingPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)
  const appHref = signedIn ? '/dashboard' : '/login'
  const ctaLabel = signedIn ? 'Open dashboard' : 'Get started'
  const jobsHref = signedIn ? '/jobs' : '/login?next=/jobs'

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader>
        <JobBoardLink href={jobsHref} />
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm">
          <Link href={appHref}>{signedIn ? 'Resumes' : 'Sign in'}</Link>
        </Button>
      </SiteHeader>

      <main className="flex-1">
        {/*
          Hero. One choreographed entrance — headline, sub, CTA, then the
          preview — staggered ~80ms apart so it reads as a single movement
          rather than four separate animations.
        */}
        <section className="mx-auto max-w-5xl px-6 pb-24 pt-20 sm:pb-32 sm:pt-28">
          <Reveal>
            <h1 className="text-display max-w-2xl">
              You forgot what you shipped.
              <br />
              <span className="text-muted-foreground">Your agent didn&apos;t.</span>
            </h1>
          </Reveal>

          <Reveal delay={90}>
            <p className="mt-7 max-w-readable text-base leading-relaxed text-muted-foreground sm:text-lg">
              Cadence gives your coding agent one instruction: write down every win as it happens.
              Then it turns that log into a real LaTeX resume — and helps you find roles that fit it.
            </p>
          </Reveal>

          <Reveal delay={180}>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" block className="group">
                <Link href={appHref}>
                  {ctaLabel}
                  <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" block>
                <Link href={jobsHref}>Explore the job board</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={270} className="mt-16 sm:mt-20">
            <TransformPreview />
          </Reveal>
        </section>

        <JobBoardShowcase href={jobsHref} />

        {/* The feature showcase. The three steps that used to live here were
            three paragraphs of text; each is now a tile that demonstrates the
            thing instead of describing it. */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
            <Reveal>
              <h2 className="text-display-sm">
                Set it up once,
                <br />
                then forget about it.
              </h2>
              <p className="mt-4 max-w-readable text-sm leading-relaxed text-muted-foreground">
                Paste one instruction into your agent. Everything after that is Cadence&apos;s job.
              </p>
            </Reveal>

            <Reveal delay={80} className="mt-12">
              <FeatureGrid />
            </Reveal>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-6 py-24 sm:py-28">
            <Reveal>
              <h2 className="text-display-sm">Questions.</h2>
            </Reveal>

            <Reveal delay={80} className="mt-10">
              <Faq />
            </Reveal>
          </div>
        </section>

        {/* Agents: one quiet line, no logo wall. */}
        <section className="border-t border-border">
          <Reveal>
            <div className="mx-auto max-w-5xl px-6 py-16">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                Works with
              </p>
              <p className="mt-4 font-mono text-sm leading-relaxed text-foreground/80">
                {AGENTS.map((agent) => agent.name).join('  ·  ')}
              </p>
              <p className="mt-4 max-w-readable text-sm text-muted-foreground">
                Any agent that reads an instructions file works — the snippet is plain English, not
                an integration.
              </p>
            </div>
          </Reveal>
        </section>

        <section className="border-t border-border">
          <Reveal>
            <div className="mx-auto max-w-5xl px-6 py-24 sm:py-28">
              <h2 className="text-display-sm max-w-lg">
                Your next resume is already half-written.
              </h2>
              <div className="mt-9">
                <Button asChild size="lg" block className="group">
                  <Link href={appHref}>
                    {ctaLabel}
                    <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooterContent />
    </div>
  )
}
