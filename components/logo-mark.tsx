import { cn } from '@/lib/utils'

/**
 * The Cadence mark: a waveform.
 *
 * The stroke traces itself on hover (see `.logo-trace` in globals.css) — the
 * rhythm the product is named for, replayed. Purely decorative, so it is hidden
 * from assistive tech and sits behind the reduced-motion rule.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', className)}
    >
      {/* Ghost stroke, so the trace has something to run along. */}
      <path
        d="M2 17c3.2 0 4.5-11 7.7-11s4.5 11 7.7 11 4.5-11 7.7-11 4.5 11 7.7 11h5.2"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="logo-trace"
        d="M2 17c3.2 0 4.5-11 7.7-11s4.5 11 7.7 11 4.5-11 7.7-11 4.5 11 7.7 11h5.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
