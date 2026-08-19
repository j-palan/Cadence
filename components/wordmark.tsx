import Link from 'next/link'

import { LogoMark } from '@/components/logo-mark'
import { cn } from '@/lib/utils'

/**
 * Mark plus name. Set in mono rather than the UI sans: this is a tool for people
 * who live in a terminal, and it distinguishes the brand from body copy.
 */
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
      <span className="font-mono text-[15px] font-medium lowercase tracking-[-0.03em]">
        cadence
      </span>
    </>
  )

  const classes = cn('group inline-flex items-center gap-2.5 text-foreground', className)

  if (!href) return <span className={classes}>{content}</span>

  return (
    <Link href={href} className={cn(classes, 'transition-opacity hover:opacity-80')}>
      {content}
    </Link>
  )
}
