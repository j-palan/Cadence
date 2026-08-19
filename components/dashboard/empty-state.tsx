import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { LOG_PATH } from '@/lib/agents'

export function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <h2 className="text-lg font-semibold tracking-tight">No resumes yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
        Import <code className="font-mono text-xs text-foreground">{LOG_PATH}</code> and Cadence
        drafts the first one for you.
      </p>
      <Button asChild className="mt-8">
        <Link href="/resume/new">
          Create a resume
          <ArrowRight />
        </Link>
      </Button>
    </div>
  )
}
