import { cn } from '@/lib/utils'

/**
 * The wordmark's glyph — a cadence waveform. Inline with the hero headline,
 * following the reference layout.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 24"
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path
        d="M2 17c3.2 0 4.5-11 7.7-11s4.5 11 7.7 11 4.5-11 7.7-11 4.5 11 7.7 11h5.2"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
