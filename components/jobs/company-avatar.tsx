'use client'

import { useState } from 'react'

// Brand accents are confined to company avatars; the app keeps its theme.
const brands: Record<string, { domain: string; color: string; initials: string }> = {
  Stripe: { domain: 'stripe.com', color: '#635BFF', initials: 'S' },
  Databricks: { domain: 'databricks.com', color: '#FF3621', initials: 'D' },
  Cloudflare: { domain: 'cloudflare.com', color: '#F48120', initials: 'C' },
  Figma: { domain: 'figma.com', color: '#A259FF', initials: 'F' },
  Roblox: { domain: 'roblox.com', color: '#335FFF', initials: 'R' },
  Duolingo: { domain: 'duolingo.com', color: '#58A700', initials: 'D' },
  MongoDB: { domain: 'mongodb.com', color: '#008A44', initials: 'M' },
  Ripple: { domain: 'ripple.com', color: '#0085C3', initials: 'R' },
  Wealthsimple: { domain: 'wealthsimple.com', color: '#977B48', initials: 'W' },
  Palantir: { domain: 'palantir.com', color: '#526D82', initials: 'P' },
}

export function CompanyAvatar({ company }: { company: string }) {
  const [failed, setFailed] = useState(false)
  const brand = brands[company]
  return (
    <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-sm font-semibold">
      <span className="absolute inset-0 opacity-10" style={{ backgroundColor: brand?.color ?? 'currentColor' }} />
      {brand && !failed ? (
        <img
          src={`https://www.google.com/s2/favicons?domain=${brand.domain}&sz=64`}
          alt="" width={24} height={24} loading="lazy" referrerPolicy="no-referrer"
          className="relative h-6 w-6 object-contain" onError={() => setFailed(true)}
        />
      ) : <span className="relative">{brand?.initials ?? company.slice(0, 2).toUpperCase()}</span>}
    </span>
  )
}
