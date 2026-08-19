'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Mail } from 'lucide-react'

const CONTACT_EMAIL = 'jaipalan88@gmail.com'

/**
 * Hidden on the editor, which is a full-height workspace with its own status
 * bar — a footer there would either eat editor height or float over the panes.
 */
export function SiteFooter() {
  const pathname = usePathname()
  if (pathname.startsWith('/resume/') && pathname !== '/resume/new') return null

  return <SiteFooterContent />
}

export function SiteFooterContent() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>
          Built for Waterloo engineers by{' '}
          <a
            href="https://www.jaipalan.com/"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-2 hover:underline"
          >
            Jai
          </a>
          .
        </p>

        <nav className="flex flex-wrap items-center gap-4">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=Cadence`}
            className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
          >
            <Mail className="h-3 w-3" />
            Contact me
          </a>
          <Link href="/terms" className="transition-colors hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-foreground">
            Privacy
          </Link>
        </nav>
      </div>
    </footer>
  )
}
