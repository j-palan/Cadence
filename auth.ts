import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'

import { db } from '@/lib/db'
import { accounts, sessions, users, verificationTokens } from '@/lib/db/schema'

/**
 * Google is the only identity provider. There is no password to set, no email
 * to verify, and nothing to reset — Google has already verified the address.
 *
 * The provider is registered only when its credentials are present so the app
 * still boots locally before a Google Cloud project exists. See the dev sign-in
 * escape hatch in `app/api/dev-login/route.ts` for that case.
 */
const googleConfigured = Boolean(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET,
)

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: googleConfigured
    ? [
        Google({
          // Non-sensitive scopes only. Anything beyond these triggers a
          // multi-week Google verification review.
          authorization: {
            params: { scope: 'openid email profile', prompt: 'select_account' },
          },
        }),
      ]
    : [],
  // Database sessions, not JWT: sign-out and account deletion take effect
  // immediately, and `onboarded` is read fresh instead of baked into a token
  // that goes stale the moment the wizard is finished.
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    // Expose id, onboarded, and agents on the session so the protected layout
    // can gate onboarding without an extra query per request.
    session({ session, user }) {
      session.user.id = user.id
      session.user.onboarded = user.onboarded ?? false
      session.user.agents = user.agents ?? []
      return session
    },
  },
})

export { googleConfigured }
