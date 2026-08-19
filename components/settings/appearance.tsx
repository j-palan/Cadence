'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Check, Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'

const OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
] as const

/**
 * Theme picker. Two explicit choices rather than a System option, because the
 * provider runs with `enableSystem={false}` — a first-time visitor on a
 * dark-mode OS should still land on the light design.
 */
export function Appearance() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // The server cannot know the stored theme; render unselected until mount.
  useEffect(() => setMounted(true), [])
  const current = mounted ? (theme === 'system' ? resolvedTheme : theme) : null

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="grid max-w-sm grid-cols-2 gap-2"
    >
      {OPTIONS.map((option) => {
        const active = current === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              'flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              active
                ? 'border-success bg-success/[0.06]'
                : 'border-border bg-card hover:border-foreground/20',
            )}
          >
            <option.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium">{option.label}</span>
            {active ? (
              <Check className="ml-auto h-4 w-4 shrink-0 text-success" strokeWidth={3} />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
