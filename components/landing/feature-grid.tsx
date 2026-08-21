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

/**
 * Rendered twice for the seamless scroll, so this list has to be TALLER than the
 * panel it scrolls inside — otherwise the window spans the seam and the same job
 * shows twice at once. Adding or removing entries here means re-checking that.
 */
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
  '## harvey-ai',
  '- RAG eval suite, 12k docs',
  '- Cut retrieval p95 60%',
  '- Citations, 40k contracts',
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
        className={cn(
          TILE,
          // min-h-0 lets the log panel below scroll within whatever height the
          // grid gives this tile, instead of its content dictating the height.
          'stagger-item flex min-h-0 flex-col border-transparent bg-[#0f5a2e] p-6 lg:row-span-2',
        )}
        style={{ '--stagger-index': 0 } as React.CSSProperties}
      >
        <Label icon={Sparkles} tone="light">
          Always on
        </Label>
        <h3 className="mt-3 text-xl font-semibold leading-tight text-white">
          Your agent writes it down.
        </h3>

        <div className="mt-6 flex min-h-[190px] flex-1 flex-col overflow-hidden rounded-lg bg-black/25 p-3.5 font-mono text-[10.5px] leading-[1.8] text-white/80">
          {/* The filename sits in its own non-scrolling row. Previously it shared
              a box with the animated list, which translated up past it and rode
              over the text. */}
          <p className="shrink-0 text-white/40">~/.claude/resume-log.md</p>

          {/* The list is absolutely positioned so it contributes nothing to
              intrinsic sizing. Grid `auto` rows size to max-content, so while it
              was in flow the duplicated list inflated this row-span-2 tile — and
              stretched its neighbours to match. */}
          <div className="relative mt-1 min-h-0 flex-1 overflow-hidden">
            {/* The list is rendered twice and scrolled by exactly -50%, so the
                loop is seamless and the file looks like it is still being
                appended to. */}
            <div className="animate-log-tail absolute inset-x-0 top-0">
              {[0, 1].map((copy) => (
                <div key={copy} aria-hidden={copy === 1}>
                  {LOG_LINES.map((line, i) => (
                    <p
                      key={`${copy}-${i}`}
                      className={cn(
                        'truncate',
                        copy === 0 && 'stagger-item',
                        line.startsWith('##') && 'mt-2 text-white/40',
                      )}
                      style={
                        {
                          '--stagger-index': i + 2,
                          '--stagger-base': '220ms',
                        } as React.CSSProperties
                      }
                    >
                      {line || '\u00a0'}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Fades the scroll in and out rather than letting lines pop at the
                edges. #0b4423 is black/25 composited over the tile's #0f5a2e,
                so the gradient matches the panel exactly. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-gradient-to-b from-[#0b4423] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0b4423] to-transparent" />
          </div>
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
                className="animate-bar h-1 rounded-full bg-success/45 transition-colors duration-500 group-hover:bg-success/70"
                style={{ width: `${w}%`, '--stagger-index': i } as React.CSSProperties}
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
          {[
            ['build pipelines', 'CI/CD'],
            ['Postgres', 'PostgreSQL'],
          ].map(([before, after], i) => (
            <p key={after} className="flex items-center gap-2 text-white/45">
              <span className="line-through decoration-white/30">{before}</span>
              <ArrowRight className="h-3 w-3 shrink-0 text-success/70" />
              <span
                className="animate-swap text-success"
                style={{ '--stagger-index': i } as React.CSSProperties}
              >
                {after}
              </span>
            </p>
          ))}
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
            <p className="flex items-center gap-1">
              \resumeItemListEnd
              <span className="animate-caret inline-block h-2.5 w-1 bg-success/70 align-middle" />
            </p>
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
          <div className="mt-4 flex items-center gap-3.5">
            {/* The arc completes in 552ms of its cycle — the number, drawn. */}
            <svg viewBox="0 0 64 64" className="h-11 w-11 shrink-0 -rotate-90" aria-hidden="true">
              <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="6" />
              <circle
                className="animate-arc"
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="hsl(142 60% 52%)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="176"
                strokeDashoffset="176"
              />
            </svg>
            <p className="font-mono text-4xl font-semibold tracking-tight text-white">
              552<span className="text-lg text-white/50">ms</span>
            </p>
          </div>
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
          {['Gemini 3.6 Flash', 'Claude Sonnet 5', 'Claude Opus 5', 'Gemini Pro'].map(
            (name, i) => (
              <span
                key={name}
                className={cn(
                  'animate-chip rounded-full border px-3 py-1 font-mono text-[11px]',
                  // Resting state is the first chip selected, which is also
                  // where the animation returns to under reduced motion.
                  i === 0
                    ? 'border-success/40 bg-success/10 text-success'
                    : 'border-border text-muted-foreground',
                )}
                style={{ '--stagger-index': i } as React.CSSProperties}
              >
                {name}
              </span>
            ),
          )}
        </div>
      </article>
    </div>
  )
}
