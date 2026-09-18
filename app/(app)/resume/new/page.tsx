import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'

import { ImportForm } from '@/components/resume/import-form'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { getAiSettingsForClient } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'New resume' }

export default async function NewResumePage() {
  const user = await requireOnboardedUser()
  const aiSettings = await getAiSettingsForClient(user.id)

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Dashboard
      </Link>

      <h1 className="mt-5 text-display-sm">New resume</h1>
      <p className="mt-3 max-w-readable text-sm leading-relaxed text-muted-foreground">
        Import your log and let your AI model draft the LaTeX, or open the template and write it yourself.
      </p>

      <div className="mt-12">
        <ImportForm
          aiSettings={
            aiSettings ?? {
              enabled: false,
              provider: null,
              model: null,
              keyHint: null,
              baseUrl: null,
            }
          }
        />
      </div>
    </main>
  )
}
