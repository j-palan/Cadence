import Link from 'next/link'
import { Settings, User as UserIcon } from 'lucide-react'

import { SignOutItem } from '@/components/auth/sign-out-item'
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        <Link
          href="/dashboard"
          className="font-mono text-sm font-medium tracking-tight hover:text-primary"
        >
          cadence
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {user.image ? (
              <img src={user.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel className="truncate font-mono normal-case">
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
    </header>
  )
}
