/**
 * The product in one picture: a plain markdown log on the left, the typeset
 * resume it becomes on the right.
 *
 * Deliberately the actual artefact on both sides, not a decorative abstraction,
 * and text-only so it costs no JavaScript. When the block scrolls into view the
 * resume side assembles line by line a beat after the log — the transformation
 * the product performs, shown rather than described. The stagger is pure CSS
 * (see `.stagger-item` in globals.css), driven by the `.reveal-in` class the
 * wrapping Reveal adds.
 */
const LOG_LINES = [
  { text: '## cadence', muted: true },
  { text: '- Cut checkout p99 840ms → 190ms with a', muted: false },
  { text: '  batched loader', muted: false },
  { text: '- Shipped SSO for 12k seats; support', muted: false },
  { text: '  tickets down 40%', muted: false },
  { text: '', muted: true },
  { text: '## pgshard', muted: true },
  { text: '- Shard router: 4.2M reads/min, p99 8ms', muted: false },
]

const RESUME_BULLETS = [
  'Cut checkout p99 latency from 840ms to 190ms by replacing N+1 lookups with a batched loader.',
  'Shipped SSO across 12,000 seats, cutting access tickets 40%.',
]

export function TransformPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="grid divide-border sm:grid-cols-2 sm:divide-x">
        {/* Source: recessed, like a file in an editor gutter. */}
        <div className="bg-muted/40 p-5">
          <p className="font-mono text-[11px] text-muted-foreground">resume-log.md</p>
          <pre className="mt-4 overflow-hidden text-[11px] leading-[1.7]">
            <code>
              {LOG_LINES.map((line, index) => (
                <span
                  key={index}
                  className={`stagger-item block truncate ${
                    line.muted ? 'text-muted-foreground/60' : 'text-foreground/75'
                  }`}
                  style={{ '--stagger-index': index } as React.CSSProperties}
                >
                  {line.text || ' '}
                </span>
              ))}
            </code>
          </pre>
        </div>

        {/* Result — white paper in both themes, because that is what the
            compiled PDF actually looks like. */}
        <div className="border-t border-border bg-white p-5 sm:border-t-0">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-success">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
            </span>
            resume.pdf
          </p>

          {/* Starts after the log has finished arriving. */}
          <div
            className="mt-4 font-serif text-[11px] leading-snug text-neutral-900"
            style={{ '--stagger-base': '520ms' } as React.CSSProperties}
          >
            <p
              className="stagger-item text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500"
              style={{ '--stagger-index': 0 } as React.CSSProperties}
            >
              Experience
            </p>
            <div
              className="stagger-item mt-1.5 h-px bg-neutral-800/30"
              style={{ '--stagger-index': 1 } as React.CSSProperties}
            />
            <div
              className="stagger-item mt-2.5 flex items-baseline justify-between gap-3"
              style={{ '--stagger-index': 2 } as React.CSSProperties}
            >
              <span className="font-semibold">Senior Software Engineer</span>
              <span className="text-[10px] text-neutral-500">2022 – Present</span>
            </div>
            <p
              className="stagger-item italic text-neutral-600"
              style={{ '--stagger-index': 3 } as React.CSSProperties}
            >
              Northwind Systems
            </p>
            <ul className="mt-2 space-y-1.5">
              {RESUME_BULLETS.map((bullet, index) => (
                <li
                  key={bullet}
                  className="stagger-item flex gap-1.5"
                  style={{ '--stagger-index': index + 4 } as React.CSSProperties}
                >
                  <span aria-hidden="true">·</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
