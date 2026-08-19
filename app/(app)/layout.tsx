import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { auth } from '@/auth'
import { AppNav } from '@/components/app-nav'
import { PATHNAME_HEADER } from '@/middleware'

/**
 * The authorization boundary for every signed-in page.
 *
 * `await auth()` hits the database, so this is a real check — unlike the
 * middleware, which only looks for a cookie.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user) redirect('/login')

  const pathname = headers().get(PATHNAME_HEADER) ?? ''

  // First login lands in the wizard and stays there until it is finished.
  if (!session.user.onboarded && pathname !== '/onboarding') {
    redirect('/onboarding')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppNav user={session.user} />
      <div className="flex-1">{children}</div>
    </div>
  )
}
