'use client'

import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

import { DropdownMenuItem } from '@/components/ui/dropdown-menu'

export function SignOutItem() {
  return (
    <DropdownMenuItem
      onSelect={(event) => {
        event.preventDefault()
        void signOut({ redirectTo: '/' })
      }}
    >
      <LogOut />
      Sign out
    </DropdownMenuItem>
  )
}
