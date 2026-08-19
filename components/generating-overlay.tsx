'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Sparkles, Target } from 'lucide-react'

import { MODE_LABELS, type GenerationMode } from '@/lib/prompts'
import { cn } from '@/lib/utils'

/**
 * The wait is 60-80 seconds on the free tier, which is far too long for a
 * spinner. This shows three real signals instead: how long it has been running,
 * which phase it is in, and the document actually arriving token by token.
 *
 * The phases are time-based rather than reported by the server — the API gives
 * no progress events — so they are worded as descriptions of the work, never as
 * a percentage that would be a lie.
 */
const PHASES: Array<{ after: number; label: string }> = [
  { after: 0, label: 'Reading your log' },
  { after: 5, label: 'Picking out what matters' },
  { after: 14, label: 'Writing bullet points' },
  { after: 32, label: 'Fitting it to one page' },
  { after: 55, label: 'Checking the layout rules' },
]

const ICONS: Record<GenerationMode, typeof Sparkles> = {
  create: FileText,
  update: Sparkles,
  tailor: Target,
}

export function GeneratingOverlay({
  mode,
  source,
  className,
}: {
  mode: GenerationMode
  /** The LaTeX streamed so far, shown as live proof of progress. */
  source: string
  className?: string
}) {
  const [elapsed, setElapsed] = useState(0)
  const streamRef = useRef<HTMLPreElement>(null)
  const Icon = ICONS[mode]

  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500)
    return () => clearInterval(timer)
  }, [])

  // Follow the stream as it grows.
  useEffect(() => {
    const el = streamRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [source])

  const phaseIndex = PHASES.reduce((acc, p, i) => (elapsed >= p.after ? i : acc), 0)
  // Only the last few lines are legible at speed, and they are the interesting ones.
  const tail = source.split('\n').slice(-14).join('\n')

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'absolute inset-0 z-40 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm',
        className,
      )}
    >
      <div className="w-full max-w-lg animate-fade-up rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/12 text-success">
            <Icon className="h-4 w-4" />
            <span className="absolute inset-0 animate-ping rounded-full bg-success/20" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{MODE_LABELS[mode].title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {MODE_LABELS[mode].description}
            </p>
          </div>
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground">
            {elapsed}s
          </span>
        </div>

        {/* Phase list — each one ticks over as the work progresses. */}
        <ol className="mt-5 space-y-1.5">
          {PHASES.map((phase, index) => {
            const done = index < phaseIndex
            const active = index === phaseIndex
            return (
              <li
                key={phase.label}
                className={cn(
                  'flex items-center gap-2.5 text-xs transition-colors',
                  active ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/45',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                    done ? 'bg-success' : active ? 'animate-pulse bg-success' : 'bg-border',
                  )}
                />
                {phase.label}
                {active ? <span className="text-muted-foreground">…</span> : null}
              </li>
            )
          })}
        </ol>

        {source.length > 0 ? (
          <div className="mt-5">
            <div className="mb-1.5 flex items-baseline justify-between">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Arriving
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {source.length.toLocaleString()} chars
              </p>
            </div>
            <pre
              ref={streamRef}
              className="h-28 overflow-hidden rounded-lg border border-border bg-background p-3 text-[10px] leading-relaxed text-muted-foreground"
            >
              <code>{tail}</code>
            </pre>
          </div>
        ) : (
          <p className="mt-5 text-xs text-muted-foreground">
            Waiting for the first tokens. This usually takes about a minute.
          </p>
        )}
      </div>
    </div>
  )
}
