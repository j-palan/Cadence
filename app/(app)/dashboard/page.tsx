import type { Metadata } from 'next'

import { EmptyState } from '@/components/dashboard/empty-state'
import { NewResumeTile } from '@/components/dashboard/new-resume-tile'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { listResumes } from '@/lib/db/queries'
import { formatRelativeTime } from '@/lib/utils'

export const metadata: Metadata = { title: 'Resumes' }

/** Local hour, so the greeting is right for whoever is reading it. */
function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

export default async function DashboardPage() {
  const user = await requireOnboardedUser()
  const resumes = await listResumes(user.id)

  const firstName = user.name?.trim().split(/\s+/)[0]
  const mostRecent = resumes[0]

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <header>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </p>
        <h1 className="text-display-sm mt-2">Your resumes</h1>

        {/* One quiet line of context, not a stats dashboard. */}
        <p className="mt-3 text-sm text-muted-foreground">
          {resumes.length === 0 ? (
            'Nothing here yet — the next one takes about a minute.'
          ) : (
            <>
              {resumes.length} {resumes.length === 1 ? 'resume' : 'resumes'}
              {mostRecent ? (
                <>
                  {' · '}last edited {formatRelativeTime(mostRecent.updatedAt)}
                </>
              ) : null}
            </>
          )}
        </p>
      </header>

      <div className="mt-10">
        {resumes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={{
                  id: resume.id,
                  name: resume.name,
                  template: resume.template,
                  updatedAt: resume.updatedAt.toISOString(),
                }}
              />
            ))}
            <NewResumeTile />
          </div>
        )}
      </div>
    </main>
  )
}
