import { AccountMenu } from '@/components/auth/account-menu'
import { HelpDialog } from '@/components/help-dialog'
import { SiteFooterContent } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { requireUser } from '@/lib/auth-guards'

/**
 * Onboarding sits in its own route group so the `(app)` layout never wraps it.
 * That is what makes the gate loop-proof: the page an un-onboarded user is sent
 * *to* cannot itself be gated. The wordmark is deliberately not a link, and
 * there is no Settings item — nothing should lead out of the wizard mid-way.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireUser()

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader wordmarkHref={null}>
        <HelpDialog />
        <AccountMenu user={user} showSettings={false} />
      </SiteHeader>

      <div className="flex-1">{children}</div>
      <SiteFooterContent />
    </div>
  )
}
