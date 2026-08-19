import { SignOutItem } from '@/components/auth/sign-out-item'
import { HelpDialog } from '@/components/help-dialog'
import { SiteFooterContent } from '@/components/site-footer'
import { Wordmark } from '@/components/wordmark'
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
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-6">
          <Wordmark href={null} />

          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md px-2 py-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {user.email}
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Signed in</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <SignOutItem />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
      <SiteFooterContent />
    </div>
  )
}
