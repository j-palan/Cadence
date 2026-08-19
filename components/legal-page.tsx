import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { SiteFooterContent } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'

/**
 * Shared shell for the terms and privacy pages. Google's OAuth consent screen
 * requires both to be reachable at a stable URL before it can be published.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string
  updated: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <h1 className="text-display-sm">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>

        <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground">
          {children}
        </div>

        <Link
          href="/"
          className="mt-12 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to home
        </Link>
      </main>

      <SiteFooterContent />
    </div>
  )
}
