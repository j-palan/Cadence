'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'

function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.96H.96a9 9 0 0 0 0 8.08l2.99-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l2.99 2.33C4.66 5.16 6.65 3.58 9 3.58z"
      />
    </svg>
  )
}

export function SignInButton({
  next = '/dashboard',
  label = 'Continue with Google',
  className,
  size,
}: {
  next?: string
  label?: string
  className?: string
  size?: 'default' | 'sm' | 'lg'
}) {
  const [pending, setPending] = useState(false)

  return (
    <Button
      className={className}
      size={size}
      disabled={pending}
      onClick={() => {
        setPending(true)
        // Errors surface as an ?error= param on /login, so no local catch.
        void signIn('google', { redirectTo: next })
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <GoogleMark />}
      {label}
    </Button>
  )
}
