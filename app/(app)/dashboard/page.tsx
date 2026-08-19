import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { Plus } from 'lucide-react'

import { auth } from '@/auth'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ResumeCard } from '@/components/dashboard/resume-card'
import { Button } from '@/components/ui/button'
import { listResumes } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const resumes = await listResumes(session.user.id)

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Resumes</h1>
          <p className="text-sm text-muted-foreground">
            {resumes.length === 0
              ? 'Nothing here yet.'
              : `${resumes.length} resume${resumes.length === 1 ? '' : 's'}.`}
          </p>
        </div>

        {resumes.length > 0 ? (
          <Button asChild size="sm">
            <Link href="/resume/new">
              <Plus />
              New resume
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="mt-8">
        {resumes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
