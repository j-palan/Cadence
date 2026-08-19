import { AccountMenu } from '@/components/auth/account-menu'
import { HelpDialog } from '@/components/help-dialog'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { requireUser } from '@/lib/auth-guards'

/**
 * Shell for signed-in pages.
 *
 * This establishes that a session exists, but it is deliberately NOT where the
 * onboarding gate lives — see the note in lib/auth-guards.ts. Each page calls
 * `requireOnboardedUser()` itself.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader wordmarkHref="/dashboard">
        <HelpDialog />
        <AccountMenu user={user} />
      </SiteHeader>

      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
