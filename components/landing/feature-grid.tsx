import { ArrowRight, FileText, Gauge, KeyRound, Sparkles, Target } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The feature showcase: a bento grid where each tile demonstrates a real
 * capability rather than describing one.
 *
 * Colour comes from green at three depths plus one near-black tile, not from a
 * multi-hue palette — a monochrome-with-one-accent grid reads as branded, where
 * assorted gradients would read as a template. The deep tiles use fixed hex
 * values rather than the theme's `--success`, because that token lightens in
 * dark mode and would take white text below AA.
 *
 * Motion budget: the whole grid assembles once when scrolled into view (the
 * `.stagger-item` classes, driven by the wrapping Reveal), and exactly one tile
 * carries a continuous ambient loop. Everything else responds only to hover.
 */
const TILE = 'group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5'

function Label({ icon: Icon, children, tone = 'dark' }: {
  icon: typeof Sparkles
  children: React.ReactNode
  tone?: 'dark' | 'light'
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em]',
        tone === 'light' ? 'text-white/70' : 'text-muted-foreground',
      )}
    >
      <Icon className="h-3 w-3" />
      {children}
    </p>
  )
}

export function FeatureGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {/* 1 — the premise. Tall tile, deep green, log appending itself. */}
      <article
        className={cn(TILE, 'border-transparent bg-[#0f5a2e] p-6 lg:row-span-2')}
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <div className="stagger-item" style={{ '--stagger-index': 0 } as React.CSSProperties}>
          <Label icon={Sparkles} tone="light">
            Always on
          </Label>
          <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
            Your agent writes it down, so you don&apos;t have to remember.
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-white/70">
            One instruction in its config. Every win appended the moment it happens, with the
            numbers still in front of it.
          </p>

          <div className="mt-6 rounded-lg bg-black/25 p-3.5 font-mono text-[10.5px] leading-[1.75] text-white/80">
            <p className="text-white/40">~/.claude/resume-log.md</p>
            {[
              '- Cut p99 840ms → 190ms',
              '- Shipped SSO, 12k seats',
              '- Migrated 3.1TB Postgres',
            ].map((line, i) => (
              <p
                key={line}
                className="stagger-item truncate"
                style={{ '--stagger-index': i + 2, '--stagger-base': '260ms' } as React.CSSProperties}
              >
                {line}
              </p>
            ))}
            <p className="flex items-center gap-1 text-white/50">
              <span>-</span>
              <span className="animate-caret inline-block h-3 w-1.5 bg-white/60 align-middle" />
            </p>
          </div>
        </div>
      </article>

      {/* 2 — the constraint that makes it usable. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 hover:border-foreground/20')}
        style={{ '--stagger-index': 1 } as React.CSSProperties}
      >
        <Label icon={FileText}>Held to one page</Label>
        <h3 className="mt-3 font-semibold leading-snug">
          4–5 bullets a job. Never spills to page two.
        </h3>

        {/* A page that visibly fits. */}
        <div className="mt-5 rounded-md border border-border bg-background p-3">
          <div className="space-y-1.5">
            <div className="h-1 w-1/3 rounded-full bg-foreground/70" />
            <div className="h-px w-full bg-border" />
            {[100, 92, 96, 78].map((w, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-success/45 transition-all duration-500 group-hover:bg-success/70"
                style={{ width: `${w}%` }}
              />
            ))}
            <div className="h-1 w-2/3 rounded-full bg-muted-foreground/25" />
          </div>
        </div>
      </article>

      {/* 3 — near-black tile for contrast. Keyword alignment, shown as a swap. */}
      <article
        className={cn(TILE, 'stagger-item border-transparent bg-neutral-950 p-6')}
        style={{ '--stagger-index': 2 } as React.CSSProperties}
      >
        <Label icon={Target} tone="light">
          Tailor per application
        </Label>
        <h3 className="mt-3 font-semibold leading-snug text-white">
          Matches the posting&apos;s words. Never invents a skill.
        </h3>

        <div className="mt-5 space-y-2 font-mono text-[11px]">
          <p className="flex items-center gap-2 text-white/45">
            <span className="line-through decoration-white/30">build pipelines</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-success" />
            <span className="text-success">CI/CD</span>
          </p>
          <p className="flex items-center gap-2 text-white/45">
            <span className="line-through decoration-white/30">Postgres</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-success" />
            <span className="text-success">PostgreSQL</span>
          </p>
          <p className="pt-1 text-[10px] normal-case tracking-normal text-white/35">
            Kubernetes not in your log? It stays out.
          </p>
        </div>
      </article>

      {/* 4 — the editor, wide tile. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 sm:col-span-2')}
        style={{ '--stagger-index': 3 } as React.CSSProperties}
      >
        <Label icon={FileText}>Real LaTeX, live PDF</Label>
        <h3 className="mt-3 font-semibold leading-snug">
          Source on the left, compiled page on the right.
        </h3>

        <div className="relative mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {/* The sweep is the one hint of process, and it only runs on reveal. */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/4 animate-sweep bg-gradient-to-r from-transparent via-success/12 to-transparent" />
          <div className="space-y-1.5 bg-background p-3 font-mono text-[9.5px] leading-relaxed text-muted-foreground">
            <p>\resumeSubheading</p>
            <p className="pl-2">{'{Senior Engineer}{2022 --}'}</p>
            <p className="pl-2 text-success/80">\resumeItem{'{Cut p99 840ms}'}</p>
            <p>\resumeItemListEnd</p>
          </div>
          <div className="space-y-1.5 bg-white p-3 font-serif text-[9.5px] leading-snug text-neutral-900">
            <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
              Experience
            </p>
            <div className="h-px bg-neutral-800/25" />
            <p className="font-semibold">Senior Engineer</p>
            <p>· Cut p99 latency 840ms → 190ms.</p>
          </div>
        </div>
      </article>

      {/* 5 — the ambient tile. This is the only continuous animation on the page. */}
      <article
        className={cn(TILE, 'stagger-item border-transparent bg-[#08301a] p-6')}
        style={{ '--stagger-index': 4 } as React.CSSProperties}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 animate-swirl rounded-full border border-success/25 border-t-success/70"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-6 h-36 w-36 animate-swirl-reverse rounded-full border border-dashed border-success/20"
        />

        <div className="relative">
          <Label icon={Gauge} tone="light">
            Compiled, not previewed
          </Label>
          <p className="mt-4 font-mono text-4xl font-semibold tracking-tight text-white">
            552<span className="text-lg text-white/50">ms</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-white/65">
            A real TeX engine renders the page you&apos;ll send. Download the exact PDF it produced.
          </p>
        </div>
      </article>

      {/* 6 — bring your own model. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 sm:col-span-2')}
        style={{ '--stagger-index': 5 } as React.CSSProperties}
      >
        <Label icon={KeyRound}>Your key, your model</Label>
        <h3 className="mt-3 font-semibold leading-snug">
          Runs on ours by default. Swap in your own any time.
        </h3>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { name: 'Gemini 3.6 Flash', active: true },
            { name: 'Claude Sonnet 5', active: false },
            { name: 'Claude Opus 5', active: false },
            { name: 'Gemini Pro', active: false },
          ].map((model) => (
            <span
              key={model.name}
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[11px] transition-colors duration-300',
                model.active
                  ? 'border-success/40 bg-success/10 text-success'
                  : 'border-border text-muted-foreground group-hover:border-foreground/20',
              )}
            >
              {model.name}
            </span>
          ))}
        </div>
      </article>
    </div>
  )
}
