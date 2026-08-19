import Link from 'next/link'

import { LogoMark } from '@/components/logo-mark'
import { cn } from '@/lib/utils'

/** The mark plus the name. A waveform, for cadence. */
export function Wordmark({
  href = '/',
  className,
}: {
  href?: string | null
  className?: string
}) {
  const content = (
    <>
      <LogoMark className="h-3.5 w-6 text-success" />
      <span className="text-sm font-semibold tracking-tight">cadence</span>
    </>
  )

  const classes = cn('inline-flex items-center gap-2', className)

  if (!href) return <span className={classes}>{content}</span>

  return (
    <Link href={href} className={cn(classes, 'transition-opacity hover:opacity-70')}>
      {content}
    </Link>
  )
}
