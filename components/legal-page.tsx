import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

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
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        cadence
      </Link>

      <h1 className="mt-6 text-2xl font-medium tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>

      <div className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:text-base [&_h2]:font-medium [&_h2]:text-foreground [&_strong]:text-foreground">
        {children}
      </div>
    </main>
  )
}
