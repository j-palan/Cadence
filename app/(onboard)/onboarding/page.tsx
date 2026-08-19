import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { OnboardingWizard } from '@/components/onboarding/wizard'
import { requireUser } from '@/lib/auth-guards'

export const metadata: Metadata = { title: 'Get set up' }

export default async function OnboardingPage() {
  const user = await requireUser()

  // The other half of the loop-safety pair: an already-onboarded user belongs in
  // the app. Because this checks `onboarded` and the app pages check
  // `!onboarded`, exactly one of the two redirects can ever fire.
  if (user.onboarded) redirect('/dashboard')

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <OnboardingWizard initialAgents={user.agents ?? []} />
    </main>
  )
}
