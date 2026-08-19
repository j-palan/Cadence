import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ResumeEditor } from '@/components/editor/resume-editor'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { getLatestLogImport, getResume } from '@/lib/db/queries'
import { getTemplateSource } from '@/lib/templates/server'

export const metadata: Metadata = { title: 'Editor' }

// The editor is per-user data behind a session check; nothing here is cacheable.
export const dynamic = 'force-dynamic'

export default async function ResumePage({ params }: { params: { id: string } }) {
  const user = await requireOnboardedUser()

  // Ownership is enforced in the query. `null` covers both "no such resume" and
  // "not yours", which is why both end up as a 404.
  const resume = await getResume(user.id, params.id)
  if (!resume) notFound()

  const log = await getLatestLogImport(user.id, resume.id)

  // A resume with no source yet opens on the template rather than an empty
  // buffer, so there is always something to compile and edit.
  const latexSource = resume.latexSource.trim()
    ? resume.latexSource
    : getTemplateSource(resume.template)

  return (
    <ResumeEditor
      resume={{
        id: resume.id,
        name: resume.name,
        template: resume.template,
        latexSource,
        updatedAt: resume.updatedAt.toISOString(),
      }}
      hasLog={Boolean(log)}
    />
  )
}
