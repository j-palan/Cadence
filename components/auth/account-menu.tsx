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

export interface AccountUser {
  name?: string | null
  email?: string | null
  image?: string | null
}

export function AccountMenu({
  user,
  showSettings = true,
}: {
  user: AccountUser
  showSettings?: boolean
}) {
  return (
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
        {showSettings ? (
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              Settings
            </Link>
          </DropdownMenuItem>
        ) : null}
        <SignOutItem />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
