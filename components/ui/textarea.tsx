import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-24 w-full rounded-lg border border-input bg-card p-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export { Textarea }
