import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

import { CompanyAvatar } from '@/components/jobs/company-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { listJobs } from '@/lib/db/queries'
import { filterJobs, groupJobsByCompany } from '@/lib/jobs/board'
import { extractProfile, matchJob } from '@/lib/jobs/matching'
import { STALE_MS } from '@/lib/jobs/sources'

interface PreviewResume { id: string; name: string; latexSource: string }

function PreviewFrame({ href, subtitle, children }: { href: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="mt-10" aria-labelledby="job-preview-heading">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="job-preview-heading" className="text-sm font-semibold">From the job board</h2>
          <p className="mt-1 break-words text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={href}>View job board<ArrowRight aria-hidden="true" /></Link>
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">{children}</div>
    </section>
  )
}

export function JobBoardPreviewLoading() {
  return (
    <PreviewFrame href="/jobs" subtitle="Finding your next role">
      <div className="divide-y divide-border" aria-label="Loading job board preview">
        {[0, 1, 2].map(i => <div key={i} className="flex items-center gap-3 px-4 py-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1"><Skeleton className="h-3 w-24" /><Skeleton className="mt-2 h-3 w-3/4" /></div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>)}
      </div>
    </PreviewFrame>
  )
}

export async function JobBoardPreview({ userId, resume }: { userId: string; resume?: PreviewResume }) {
  const href = resume ? `/jobs?resume=${encodeURIComponent(resume.id)}` : '/jobs'
  let rows: Awaited<ReturnType<typeof listJobs>>
  try {
    // Read the last successful snapshot. Dashboard visits never wait on employer
    // requests, and a failed preview must not break access to the user's resumes.
    rows = await listJobs(userId)
  } catch {
    return <PreviewFrame href={href} subtitle="Fresh opportunities, all in one place">
      <p className="px-4 py-6 text-sm text-muted-foreground">The preview is temporarily unavailable. Open the job board to try again.</p>
    </PreviewFrame>
  }

  const profile = resume?.latexSource.trim() ? extractProfile(resume.latexSource) : null
  const hasProfile = !!profile && profile.text.length >= 50
  const now = Date.now()
  const jobs = rows.map(({ job, savedAt }) => ({
    ...job, firstSeenAt: job.firstSeenAt.toISOString(), checkedAt: job.checkedAt.toISOString(),
    available: job.active && now - job.checkedAt.getTime() < STALE_MS,
    saved: !!savedAt, match: matchJob(profile, job.description),
  }))
  const ranked = filterJobs(jobs, { search: '', country: 'all', term: 'all', remote: false, savedOnly: false, sort: 'fit' })
  const companies = groupJobsByCompany(ranked)
  const subtitle = hasProfile && resume
    ? `Top matches for ${resume.name} · One role per company`
    : 'Software engineering internships · US and Canada'

  return (
    <PreviewFrame href={href} subtitle={subtitle}>
      {companies.length ? (
        <div className="divide-y divide-border">
          {companies.slice(0, 3).map(({ company, jobs }) => {
            const job = jobs[0]
            return (
              <Link key={company} href={`${href}${resume ? '&' : '?'}job=${encodeURIComponent(job.id)}`}
                className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                aria-label={`View ${job.title} at ${company}`}>
                <CompanyAvatar company={company} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">{company}<span className="ml-2 font-normal text-muted-foreground">{jobs.length} {jobs.length === 1 ? 'role' : 'roles'}</span></p>
                  <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">{job.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{job.location}</p>
                </div>
                <Badge variant={job.match.score !== null && job.match.score >= 70 ? 'success' : 'outline'} className="shrink-0 tabular-nums">
                  {job.match.score === null ? 'View role' : `${job.match.score}% fit`}
                </Badge>
                <ArrowRight aria-hidden="true" className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="px-5 py-6">
          <p className="text-sm font-medium">Find your next opportunity</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Open the job board to check the latest roles, compare resume fit, and save the ones you like.</p>
        </div>
      )}
    </PreviewFrame>
  )
}
