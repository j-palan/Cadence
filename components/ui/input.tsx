import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        // 16px on mobile prevents iOS auto-zoom on focus.
        'flex h-10 w-full rounded-lg border border-input bg-card px-3 text-base transition-colors placeholder:text-muted-foreground focus-visible:border-success focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export { Input }
