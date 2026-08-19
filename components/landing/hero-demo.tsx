'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * The above-the-fold demo: a log on the left, LaTeX typing itself out on the
 * right. No hero image, no video — the animation is the product description.
 */
const LOG_LINES = [
  '## cadence',
  '- Cut checkout p99 840ms → 190ms with a batched loader',
  '- Shipped SSO for 12k seats; support tickets down 40%',
  '- Migrated 3.1TB Postgres with 20 min of downtime',
  '',
  '## pgshard',
  '- Wrote the shard router; 4.2M reads/min at p99 8ms',
]

const LATEX_OUTPUT = `\\resumeSubheading
  {Senior Software Engineer}{2022 -- Present}
  {Northwind Systems}{San Francisco, CA}
  \\resumeItemListStart
    \\resumeItem{Cut checkout p99 latency from 840ms
      to 190ms by replacing N+1 lookups with a
      batched loader.}
    \\resumeItem{Shipped SSO across 12,000 seats,
      reducing access-related support tickets 40\\%.}
    \\resumeItem{Migrated a 3.1TB Postgres cluster
      with 20 minutes of downtime.}
  \\resumeItemListEnd`

const CHARS_PER_TICK = 3
const TICK_MS = 18
const RESTART_DELAY_MS = 3200

export function HeroDemo() {
  const [typed, setTyped] = useState(0)
  const frame = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    // Respect a reduced-motion preference by showing the finished state.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setTyped(LATEX_OUTPUT.length)
      return
    }

    function tick() {
      setTyped((current) => {
        if (current >= LATEX_OUTPUT.length) {
          frame.current = setTimeout(() => setTyped(0), RESTART_DELAY_MS)
          return current
        }
        frame.current = setTimeout(tick, TICK_MS)
        return Math.min(current + CHARS_PER_TICK, LATEX_OUTPUT.length)
      })
    }

    frame.current = setTimeout(tick, 600)
    return () => clearTimeout(frame.current)
  }, [])

  const done = typed >= LATEX_OUTPUT.length

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
        <span className="ml-2 font-mono text-[11px] text-muted-foreground">
          cadence-log.md → resume.tex
        </span>
      </div>

      <div className="grid divide-border md:grid-cols-2 md:divide-x">
        <pre className="overflow-hidden p-4 text-[11px] leading-relaxed text-muted-foreground">
          <code>{LOG_LINES.join('\n')}</code>
        </pre>

        <div className="border-t border-border md:border-t-0">
          <pre className="min-h-[13rem] overflow-hidden p-4 text-[11px] leading-relaxed">
            <code className="text-primary">
              {LATEX_OUTPUT.slice(0, typed)}
              {!done ? (
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-caret-blink bg-primary align-middle" />
              ) : null}
            </code>
          </pre>
        </div>
      </div>
    </div>
  )
}
