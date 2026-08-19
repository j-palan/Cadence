'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

import { auth } from '@/auth'
import { AGENT_IDS } from '@/lib/agents'
import { completeOnboarding } from '@/lib/db/queries'

const schema = z.object({
  agents: z.array(z.enum(AGENT_IDS as [string, ...string[]])).min(1),
})

export async function finishOnboarding(agents: string[]) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const parsed = schema.safeParse({ agents })
  if (!parsed.success) {
    return { error: 'Pick at least one agent.' as const }
  }

  // userId from the session, never from the caller.
  await completeOnboarding(session.user.id, parsed.data.agents)
  redirect('/dashboard')
}
