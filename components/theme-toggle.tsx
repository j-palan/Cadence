'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

import { Button } from '@/components/ui/button'

/**
 * The header's theme switch, for visitors who have not signed in yet — once they
 * have, Settings owns this and the button comes out of the header rather than
 * offering the same control in two places.
 *
 * Two states, not three: the provider runs with `enableSystem={false}`, so
 * someone arriving on a dark-mode OS still lands on the light design.
 *
 * The icon shows the theme you would switch *to*, which is why the label reads
 * as an action. The server has no way to know the stored theme, so the icon is
 * held back until mount — the button keeps its footprint from the first paint so
 * the wordmark and sign-in link never shift sideways when it resolves.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const current = theme === 'system' ? resolvedTheme : theme
  const next = current === 'dark' ? 'light' : 'dark'

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={mounted ? `Switch to ${next} theme` : 'Switch theme'}
      title={mounted ? `Switch to ${next} theme` : undefined}
      className="h-9 w-9 text-muted-foreground hover:text-foreground"
    >
      {mounted ? (
        next === 'dark' ? (
          <Moon className="h-[17px] w-[17px]" />
        ) : (
          <Sun className="h-[17px] w-[17px]" />
        )
      ) : null}
    </Button>
  )
}
