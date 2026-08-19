import { Wordmark } from '@/components/wordmark'

/**
 * The one header, used on every page.
 *
 * The container is a single fixed geometry everywhere — the wordmark does not
 * move between routes, which it used to do (four different x-positions,
 * depending on whether the page column was 2xl, 5xl, full-bleed, or the
 * editor's). Page content keeps its own narrower column; the header does not
 * inherit it.
 *
 * `max-w-[1600px]` keeps it from hugging the extreme edge of an ultra-wide
 * display while behaving as plain edge padding on anything normal.
 */
export function SiteHeader({
  children,
  wordmarkHref = '/',
}: {
  children?: React.ReactNode
  wordmarkHref?: string | null
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      {/* Signature hairline: green at the wordmark, fading out across the page. */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-success/70 via-success/15 to-transparent"
      />

      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-6">
        <Wordmark href={wordmarkHref} />
        <div className="flex items-center gap-1">{children}</div>
      </div>
    </header>
  )
}
