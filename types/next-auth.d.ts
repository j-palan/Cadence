import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      onboarded: boolean
      agents: string[]
    } & DefaultSession['user']
  }

  interface User {
    onboarded?: boolean
    agents?: string[]
  }
}
