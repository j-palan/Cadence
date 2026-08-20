import { ArrowRight, FileText, Gauge, KeyRound, Sparkles, Target } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * The feature showcase: a bento grid where each tile demonstrates a capability
 * rather than describing one.
 *
 * Deliberately close to wordless — a label, a heading of a few words, and a
 * visual. The earlier version carried a paragraph per tile, which made a grid
 * meant for glancing into something you had to read. Anything that needs a
 * sentence belongs in the FAQ below, not here.
 *
 * Colour comes from green at three depths plus one near-black tile rather than a
 * multi-hue palette: monochrome-with-one-accent reads as branded where assorted
 * gradients read as a template. The dark tiles use fixed hex values, not the
 * `--success` token, because that lightens in dark mode and would take white
 * text below AA.
 *
 * Motion budget: the grid assembles once on scroll (`.stagger-item`, driven by
 * the wrapping Reveal) and exactly one tile carries a continuous loop.
 */
const TILE =
  'group relative overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-0.5'

const LOG_LINES = [
  '## cadence',
  '- Cut p99 840ms → 190ms',
  '- Shipped SSO, 12k seats',
  '- Migrated 3.1TB Postgres',
  '## pgshard',
  '- 4.2M reads/min, p99 8ms',
  '- Cut shard rebalance 40%',
  '## opslevel',
  '- LLM-as-judge harness, 0-100',
  '- Prompt caching, 10x cheaper',
]

function Label({
  icon: Icon,
  children,
  tone = 'dark',
}: {
  icon: typeof Sparkles
  children: React.ReactNode
  tone?: 'dark' | 'light'
}) {
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em]',
        tone === 'light' ? 'text-white/60' : 'text-muted-foreground',
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
      {/* 1 — the premise. Tall tile; the log does the explaining. */}
      <article
        className={cn(TILE, 'stagger-item flex flex-col border-transparent bg-[#0f5a2e] p-6 lg:row-span-2')}
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <Label icon={Sparkles} tone="light">
          Always on
        </Label>
        <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
          Your agent writes it down.
        </h3>

        <div className="mt-6 flex-1 rounded-lg bg-black/25 p-3.5 font-mono text-[10.5px] leading-[1.8] text-white/80">
          <p className="text-white/40">~/.claude/resume-log.md</p>
          {/* Enough lines that the panel reads as a real file rather than a
              short list padded out to fill the tile. */}
          {LOG_LINES.map((line, i) => (
            <p
              key={i}
              className={cn(
                'stagger-item truncate',
                line.startsWith('##') && 'mt-2 text-white/40',
              )}
              style={
                { '--stagger-index': i + 2, '--stagger-base': '220ms' } as React.CSSProperties
              }
            >
              {line || '\u00a0'}
            </p>
          ))}
          <p className="flex items-center gap-1 text-white/50">
            <span>-</span>
            <span className="animate-caret inline-block h-3 w-1.5 bg-white/60 align-middle" />
          </p>
        </div>
      </article>

      {/* 2 — the constraint. The bars show the bullet count. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 hover:border-foreground/20')}
        style={{ '--stagger-index': 1 } as React.CSSProperties}
      >
        <Label icon={FileText}>One page, always</Label>
        <h3 className="mt-3 font-semibold leading-snug">Never spills to page two.</h3>

        <div className="mt-5 rounded-md border border-border bg-background p-3">
          <div className="space-y-1.5">
            <div className="h-1 w-1/3 rounded-full bg-foreground/70" />
            <div className="h-px w-full bg-border" />
            {[100, 92, 96, 78].map((w, i) => (
              <div
                key={i}
                className="h-1 rounded-full bg-success/45 transition-colors duration-500 group-hover:bg-success/70"
                style={{ width: `${w}%` }}
              />
            ))}
            <div className="h-1 w-2/3 rounded-full bg-muted-foreground/25" />
          </div>
        </div>
      </article>

      {/* 3 — near-black tile. The swap shows what tailoring does. */}
      <article
        className={cn(TILE, 'stagger-item border-transparent bg-neutral-950 p-6')}
        style={{ '--stagger-index': 2 } as React.CSSProperties}
      >
        <Label icon={Target} tone="light">
          Tailor to the job
        </Label>
        <h3 className="mt-3 font-semibold leading-snug text-white">Speaks their language.</h3>

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
        </div>
      </article>

      {/* 4 — the editor, wide. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 sm:col-span-2')}
        style={{ '--stagger-index': 3 } as React.CSSProperties}
      >
        <Label icon={FileText}>Real LaTeX</Label>
        <h3 className="mt-3 font-semibold leading-snug">Source left, compiled page right.</h3>

        <div className="relative mt-5 grid gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2">
          {/* The one hint of process, and it only runs on reveal. */}
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

      {/* 5 — the ambient tile. The only continuous animation on the page. */}
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
          <p className="mt-2 text-sm text-white/60">Real TeX. Download that exact PDF.</p>
        </div>
      </article>

      {/* 6 — bring your own model. The chips are the explanation. */}
      <article
        className={cn(TILE, 'stagger-item border-border bg-card p-6 sm:col-span-2')}
        style={{ '--stagger-index': 5 } as React.CSSProperties}
      >
        <Label icon={KeyRound}>Your key, your model</Label>
        <h3 className="mt-3 font-semibold leading-snug">Swap in your own any time.</h3>

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
