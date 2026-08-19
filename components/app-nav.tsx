'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, User as UserIcon } from 'lucide-react'

import { SignOutItem } from '@/components/auth/sign-out-item'
import { ThemeToggle } from '@/components/theme-toggle'
import { Wordmark } from '@/components/wordmark'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface NavUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

/**
 * The editor uses the full viewport width, so a nav still centred in a 5xl
 * column leaves the wordmark and account button stranded mid-page. On the
 * editor route the container widens to the edges instead.
 *
 * Animating `max-width` (rather than swapping to `w-full`) is what makes it
 * slide: the used width is min(100%, max-width), so it eases outward until it
 * meets the viewport. The reduced-motion rule in globals.css turns this into an
 * instant change for anyone who asked for that.
 */
export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname()

  // The editor only — /resume/new is an ordinary centred page.
  const wide = pathname.startsWith('/resume/') && pathname !== '/resume/new'

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div
        className={cn(
          'mx-auto flex h-16 items-center justify-between gap-4 transition-[max-width,padding] duration-500 ease-out',
          wide ? 'max-w-[140rem] px-4' : 'max-w-5xl px-6',
        )}
      >
        <Wordmark href="/dashboard" />

        <div className="flex items-center gap-1">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger className="ml-1 flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-card transition-colors hover:border-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              {user.image ? (
                <img src={user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="sr-only">Account menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-52">
              <DropdownMenuLabel className="truncate font-mono text-[11px] normal-case">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>
              <SignOutItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
