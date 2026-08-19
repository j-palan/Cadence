import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { auth } from '@/auth'
import { OnboardingWizard } from '@/components/onboarding/wizard'

export const metadata: Metadata = { title: 'Get set up' }

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <OnboardingWizard initialAgents={session.user.agents ?? []} />
    </main>
  )
}
