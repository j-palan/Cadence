'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'

/** Visible in the header on both the landing page and signed-in screens. */
export function JobBoardLink({ href = '/jobs' }: { href?: string }) {
  const current = usePathname() === '/jobs'
  return (
    <nav aria-label="Job board navigation">
      <Button asChild variant={current ? 'secondary' : 'ghost'} size="sm">
        <Link href={href} aria-current={current ? 'page' : undefined}>Job board</Link>
      </Button>
    </nav>
  )
}
