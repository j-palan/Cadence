import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { ImportForm } from '@/components/resume/import-form'

export const metadata: Metadata = { title: 'New resume' }

export default function NewResumePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Dashboard
      </Link>

      <h1 className="mt-4 text-xl font-medium tracking-tight">New resume</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Import your log and let Claude draft the LaTeX, or open the template and write it yourself.
      </p>

      <div className="mt-10">
        <ImportForm />
      </div>
    </main>
  )
}
