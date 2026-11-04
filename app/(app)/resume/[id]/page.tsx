import { notFound } from 'next/navigation'
import type { Metadata } from 'next'

import { ResumeEditor } from '@/components/editor/resume-editor'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { getAiSettingsForClient, getLatestLogImport, getResume, getJob } from '@/lib/db/queries'
import { getTemplateSource } from '@/lib/templates/server'
import { MAX_JOB_DESCRIPTION_CHARS } from '@/lib/generate'

export const metadata: Metadata = { title: 'Editor' }

// The editor is per-user data behind a session check; nothing here is cacheable.
export const dynamic = 'force-dynamic'

export default async function ResumePage({ params, searchParams }: {
  params: { id: string }
  searchParams: { job?: string }
}) {
  const user = await requireOnboardedUser()

  // Ownership is enforced in the query. `null` covers both "no such resume" and
  // "not yours", which is why both end up as a 404.
  const [resume, aiSettings] = await Promise.all([
    getResume(user.id, params.id),
    getAiSettingsForClient(user.id),
  ])
  if (!resume) notFound()

  const log = await getLatestLogImport(user.id, resume.id)
  const job = searchParams.job ? await getJob(user.id, searchParams.job.slice(0, 200)) : null
  const initialJobDescription = job
    ? `${job.title}\n${job.company}\n${job.location}\n\n${job.description}`.slice(0, MAX_JOB_DESCRIPTION_CHARS)
    : undefined

  // A resume with no source yet opens on the template rather than an empty
  // buffer, so there is always something to compile and edit.
  const latexSource = resume.latexSource.trim()
    ? resume.latexSource
    : getTemplateSource(resume.template)

  return (
    <ResumeEditor
      key={`${resume.id}:${job?.id ?? ''}`}
      initialJobDescription={initialJobDescription}
      resume={{
        id: resume.id,
        name: resume.name,
        template: resume.template,
        latexSource,
        updatedAt: resume.updatedAt.toISOString(),
      }}
      lastLogImportedAt={log?.importedAt.toISOString() ?? null}
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
  )
}
