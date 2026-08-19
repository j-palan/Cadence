import Link from 'next/link'

import { SignOutItem } from '@/components/auth/sign-out-item'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { requireUser } from '@/lib/auth-guards'

/**
 * A deliberately minimal shell for onboarding.
 *
 * Onboarding sits in its own route group so the `(app)` layout never wraps it.
 * That is what makes the gate loop-proof: the page an un-onboarded user is sent
 * *to* cannot itself be gated. It also means no nav links into the app, so Next
 * never prefetches a route that would bounce straight back here.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-6">
          <span className="font-mono text-sm font-medium tracking-tight">cadence</span>

          <DropdownMenu>
            <DropdownMenuTrigger className="font-mono text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {user.email}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Signed in</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <SignOutItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-2xl gap-4 px-6 py-4 text-xs text-muted-foreground">
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  )
}
