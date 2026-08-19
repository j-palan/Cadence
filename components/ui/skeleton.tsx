import { cn } from '@/lib/utils'

/**
 * Placeholder block for content that has not arrived yet.
 *
 * The pulse is disabled under `prefers-reduced-motion` by the global rule in
 * globals.css, which leaves a static grey block — still a useful layout preview.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}
