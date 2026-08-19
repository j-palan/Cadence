'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, TerminalSquare } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Development-only sign-in. Creates (or reuses) a user with the given email and
 * writes a session row directly, which lets the app run locally before a Google
 * Cloud project exists. The route behind it returns 404 unless
 * AUTH_DEV_LOGIN=true and NODE_ENV is not production.
 */
export function DevSignIn({ next = '/dashboard' }: { next?: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('dev@example.com')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Dev sign-in failed (${response.status})`)
      }

      router.push(next)
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Dev sign-in failed')
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-dashed border-border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <TerminalSquare className="h-3.5 w-3.5" />
        Local development sign-in
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dev-email" className="text-xs text-muted-foreground">
          Email
        </Label>
        <Input
          id="dev-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="font-mono text-xs"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" variant="outline" size="sm" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Sign in without Google
      </Button>
    </form>
  )
}
