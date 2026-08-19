/**
 * The product in one picture: a plain markdown log on the left, the typeset
 * resume it becomes on the right.
 *
 * Deliberately static and text-only — it is the actual artefact on both sides,
 * not a decorative abstraction, and it costs no JavaScript.
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
                  className={`block truncate ${line.muted ? 'text-muted-foreground/60' : 'text-foreground/75'}`}
                >
                  {line.text || ' '}
                </span>
              ))}
            </code>
          </pre>
        </div>

        {/* Result — rendered the way the compiled PDF actually looks. */}
        <div className="border-t border-border bg-white p-5 sm:border-t-0">
          <p className="flex items-center gap-1.5 font-mono text-[11px] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            resume.pdf
          </p>
          <div className="mt-4 font-serif text-[11px] leading-snug text-neutral-900">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
              Experience
            </p>
            <div className="mt-1.5 h-px bg-neutral-800/30" />
            <div className="mt-2.5 flex items-baseline justify-between gap-3">
              <span className="font-semibold">Senior Software Engineer</span>
              <span className="text-[10px] text-neutral-500">2022 – Present</span>
            </div>
            <p className="italic text-neutral-600">Northwind Systems</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex gap-1.5">
                <span aria-hidden="true">·</span>
                <span>
                  Cut checkout p99 latency from 840ms to 190ms by replacing N+1 lookups with a
                  batched loader.
                </span>
              </li>
              <li className="flex gap-1.5">
                <span aria-hidden="true">·</span>
                <span>Shipped SSO across 12,000 seats, cutting access tickets 40%.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
