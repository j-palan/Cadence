import Link from 'next/link'
import type { Metadata } from 'next'
import { Plus } from 'lucide-react'

import { EmptyState } from '@/components/dashboard/empty-state'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { Button } from '@/components/ui/button'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { listResumes } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Resumes' }

export default async function DashboardPage() {
  const user = await requireOnboardedUser()
  const resumes = await listResumes(user.id)

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-display-sm">Resumes</h1>

        {resumes.length > 0 ? (
          <Button asChild size="sm">
            <Link href="/resume/new">
              <Plus />
              New resume
            </Link>
          </Button>
        ) : null}
      </div>

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
          </div>
        )}
      </div>
    </main>
  )
}
