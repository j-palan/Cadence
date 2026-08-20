'use client'

import { usePathname } from 'next/navigation'

import { Wordmark } from '@/components/wordmark'
import { cn } from '@/lib/utils'

/**
 * The one header, used on every page, in a single fixed geometry — the wordmark
 * does not wander between routes the way it used to (it previously sat at four
 * different x-positions depending on each page's column width).
 *
 * The editor is the one exception, and for a concrete reason: it is a full-bleed
 * workspace whose own toolbar and status bar sit at `px-4`, while the header
 * elsewhere is a centred `max-w-[1600px]` column at `px-6`. Left alone, the
 * wordmark hangs 8px inside the toolbar below it — and much further in on a wide
 * display, where the cap bites but the editor does not. On that route the
 * container widens to the viewport and matches the toolbar's padding exactly.
 *
 * Both properties are transitioned, so entering and leaving the editor slides
 * rather than jumps. The reduced-motion rule in globals.css turns it into an
 * instant change for anyone who asked for that.
 */
export function SiteHeader({
  children,
  wordmarkHref = '/',
}: {
  children?: React.ReactNode
  wordmarkHref?: string | null
}) {
  const pathname = usePathname()

  // The editor only. /resume/new is an ordinary centred page.
  const isEditor = pathname.startsWith('/resume/') && pathname !== '/resume/new'

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      {/* Signature hairline: green at the wordmark, fading out across the page. */}
      <div
        aria-hidden="true"
        className="h-px bg-gradient-to-r from-success/70 via-success/15 to-transparent"
      />

      <div
        className={cn(
          'mx-auto flex h-16 items-center justify-between gap-4 transition-[max-width,padding] duration-500 ease-out',
          isEditor ? 'max-w-full px-4' : 'max-w-[1600px] px-6',
        )}
      >
        <Wordmark href={wordmarkHref} />
        <div className="flex items-center gap-1">{children}</div>
      </div>
    </header>
  )
}
