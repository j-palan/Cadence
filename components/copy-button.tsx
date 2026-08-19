'use client'

import { useEffect, useState } from 'react'
import { Check, Copy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function CopyButton({
  value,
  label = 'Copy',
  className,
  size = 'sm',
  variant = 'outline',
}: {
  value: string
  label?: string
  className?: string
  size?: 'sm' | 'default' | 'icon'
  variant?: 'outline' | 'ghost' | 'secondary'
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      // Clipboard access can be denied; the snippet is selectable either way.
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={copy}
      className={cn(copied && 'text-success', className)}
    >
      {copied ? <Check /> : <Copy />}
      {size === 'icon' ? null : copied ? 'Copied' : label}
    </Button>
  )
}
