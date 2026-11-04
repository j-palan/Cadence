import type { Metadata } from 'next'

import { JobsBoard } from '@/components/jobs/jobs-board'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { getResume, listResumes, listJobs, listJobSources } from '@/lib/db/queries'
import { extractProfile, matchJob } from '@/lib/jobs/matching'
import { JOB_SOURCES, STALE_MS } from '@/lib/jobs/sources'
import { syncJobs } from '@/lib/jobs/sync'

export const metadata: Metadata = { title: 'Job board' }
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export default async function JobsPage({ searchParams }: { searchParams: { resume?: string; job?: string } }) {
  const user = await requireOnboardedUser()
  const resumes = await listResumes(user.id)
  const selected = resumes.find(resume => resume.id === searchParams.resume) ?? resumes[0]

  // Traffic also refreshes due feeds. Database leases coordinate app replicas.
  // A refresh failure must not prevent browsing the last successful snapshot.
  try { await syncJobs() } catch (error) { console.error('Job refresh failed', error instanceof Error ? error.name : 'UnknownError') }
  const [resume, rows, sources] = await Promise.all([
    selected ? getResume(user.id, selected.id) : null,
    listJobs(user.id),
    listJobSources(user.id),
  ])
  const profile = resume?.latexSource.trim() ? extractProfile(resume.latexSource) : null
  const now = Date.now()
  const seen = new Set<string>()
  // Keep a bookmarked copy in preference to an identical syndicated posting.
  const deduplicated = [...rows].sort((a, b) => Number(!!b.savedAt) - Number(!!a.savedAt)).filter(({ job, savedAt }) => {
    const key = `${job.company}:${job.title}:${job.location}`.toLowerCase()
    if (seen.has(key) && !savedAt) return false
    seen.add(key)
    return true
  })
  const postings = deduplicated.map(({ job, savedAt, application }) => ({
    application: application ? { status: application.status, resumeId: application.resumeId, resumeName: application.resumeName, appliedAt: application.appliedAt?.toISOString() ?? null, notes: application.notes } : null,
    id: job.id, company: job.company, title: job.title, location: job.location,
    countries: job.countries, remote: job.remote, term: job.term,
    description: job.description, url: job.url,
    firstSeenAt: job.firstSeenAt.toISOString(), checkedAt: job.checkedAt.toISOString(),
    available: job.active && now - job.checkedAt.getTime() < STALE_MS,
    saved: !!savedAt, match: matchJob(profile, job.description),
  }))
  const healthy = sources.filter(source => source.checkedAt && !source.error && now - source.checkedAt.getTime() < STALE_MS)
  const lastChecked = sources.reduce((latest, source) => Math.max(latest, source.checkedAt?.getTime() ?? 0), 0)

  return (
    <JobsBoard
      initialJobId={postings.find(job => job.id === searchParams.job && job.available)?.id}
      jobs={postings}
      resumes={resumes.map(({ id, name }) => ({ id, name }))}
      selectedResume={selected?.id ?? ''}
      hasProfile={!!profile && profile.text.length >= 50}
      sources={{ total: JOB_SOURCES.length, healthy: healthy.length, lastChecked: lastChecked ? new Date(lastChecked).toISOString() : null }}
    />
  )
}
