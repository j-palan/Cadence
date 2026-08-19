import Link from 'next/link'
import { ArrowRight, FileText, GitBranch, Sparkles } from 'lucide-react'

import { auth } from '@/auth'
import { SignInButton } from '@/components/auth/sign-in-button'
import { HeroDemo } from '@/components/landing/hero-demo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AGENTS, LOG_PATH } from '@/lib/agents'

const STEPS = [
  {
    icon: GitBranch,
    title: 'Add one snippet',
    body: `Paste a five-line instruction into your agent's config. It starts appending your wins to ${LOG_PATH} as they happen.`,
  },
  {
    icon: Sparkles,
    title: 'Go code',
    body: 'Ship features, fix hard bugs, cut latency. Your agent writes each one down while the details are still fresh.',
  },
  {
    icon: FileText,
    title: 'Import and generate',
    body: 'Cadence turns the log into a LaTeX resume, then hands you a live editor with a compiled PDF beside it.',
  },
]

export default async function LandingPage() {
  const session = await auth()
  const signedIn = Boolean(session?.user)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="font-mono text-sm font-medium tracking-tight">cadence</span>
          {signedIn ? (
            <Button asChild size="sm">
              <Link href="/dashboard">
                Dashboard
                <ArrowRight />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-grid opacity-30" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-6 py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <Badge variant="accent">For people who code with agents</Badge>
                <h1 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">
                  Log your wins as they happen.
                  <span className="block text-muted-foreground">
                    Cadence turns them into a resume.
                  </span>
                </h1>
                <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                  You already forgot the last three things you shipped. Your coding agent did not —
                  give it one instruction and it keeps the record for you. Cadence compiles that
                  record into a real LaTeX resume you can edit and export.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  {signedIn ? (
                    <Button asChild size="lg">
                      <Link href="/dashboard">
                        Open dashboard
                        <ArrowRight />
                      </Link>
                    </Button>
                  ) : (
                    <SignInButton size="lg" />
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    Google sign-in · no password
                  </span>
                </div>
              </div>

              <HeroDemo />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              How it works
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <div key={step.title} className="space-y-3 rounded-lg border border-border p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-border font-mono text-xs text-muted-foreground">
                      {index + 1}
                    </span>
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-medium">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Agents */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Works with
            </h2>
            <ul className="mt-6 flex flex-wrap gap-2">
              {AGENTS.map((agent) => (
                <li
                  key={agent.id}
                  className="rounded-sm border border-border px-3 py-1.5 font-mono text-sm text-muted-foreground"
                >
                  {agent.name}
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">
              Any agent that reads a rules or instructions file works — the snippet is plain
              English, not an integration.
            </p>
          </div>
        </section>

        {/* Editor */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div className="space-y-4">
                <h2 className="text-2xl font-medium tracking-tight">
                  A real LaTeX editor, not a form
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Source on the left, compiled PDF on the right, recompiling as you type — the
                  workflow you already know from Overleaf. It starts on{' '}
                  <a
                    href="https://github.com/jakegut/resume"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Jake&apos;s Resume
                  </a>
                  , the single-column template that reliably survives an ATS parse.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    'Autosave, then autocompile — or ⌘S to do both now',
                    'Compiler errors with line numbers, plus the full log',
                    'Download the PDF the same engine produced',
                  ].map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-primary">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <div className="grid grid-cols-2 divide-x divide-border">
                  <pre className="bg-[#282c34] p-4 text-[10px] leading-relaxed text-[#abb2bf]">
                    <code>{`\\section{Experience}
\\resumeSubHeadingListStart
  \\resumeSubheading
    {Senior Engineer}{2022 -- Now}
    {Northwind}{SF, CA}
    \\resumeItemListStart
      \\resumeItem{Cut p99 840ms
        → 190ms.}
    \\resumeItemListEnd
\\resumeSubHeadingListEnd`}</code>
                  </pre>
                  <div className="space-y-2 bg-white p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-neutral-900">
                      Experience
                    </div>
                    <div className="h-px bg-neutral-900" />
                    <div className="flex justify-between text-[9px] text-neutral-900">
                      <span className="font-bold">Senior Engineer</span>
                      <span>2022 – Now</span>
                    </div>
                    <div className="flex justify-between text-[9px] italic text-neutral-700">
                      <span>Northwind</span>
                      <span>SF, CA</span>
                    </div>
                    <div className="text-[9px] leading-snug text-neutral-800">
                      • Cut p99 840ms → 190ms.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section>
          <div className="mx-auto max-w-6xl px-6 py-20 text-center">
            <h2 className="text-2xl font-medium tracking-tight">
              Your next resume is already half-written.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
              Set it up once. In a week you will have a log worth turning into something.
            </p>
            <div className="mt-8 flex justify-center">
              {signedIn ? (
                <Button asChild size="lg">
                  <Link href="/dashboard">
                    Open dashboard
                    <ArrowRight />
                  </Link>
                </Button>
              ) : (
                <SignInButton size="lg" />
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground">
          <span className="font-mono">cadence</span>
          <nav className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
