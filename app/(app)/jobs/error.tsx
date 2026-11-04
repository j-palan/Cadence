'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function JobsError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <h1 className="text-display-sm">Job board is temporarily unavailable</h1>
      <p className="mt-3 text-sm text-muted-foreground">We couldn’t load the board. Please try again shortly.</p>
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline"><Link href="/dashboard">Back to resumes</Link></Button>
      </div>
    </main>
  )
}
