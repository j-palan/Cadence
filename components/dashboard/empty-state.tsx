import Link from 'next/link'
import { FilePlus2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LOG_PATH } from '@/lib/agents'

export function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center">
      <FilePlus2 className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-4 font-medium">No resumes yet</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Import <code className="text-primary">{LOG_PATH}</code> and Cadence will turn what your
        agents logged into a first draft.
      </p>
      <Button asChild className="mt-6">
        <Link href="/resume/new">Create your first resume</Link>
      </Button>
    </div>
  )
}
