import Link from 'next/link'
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

interface NavUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function AppNav({ user }: { user: NavUser }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-6">
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
