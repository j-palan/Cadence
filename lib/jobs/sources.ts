export interface JobSource {
  provider: 'greenhouse' | 'lever' | 'ashby'
  board: string
  company: string
  domain: string
  startup?: boolean
  /** Verified public YC company profile; membership does not imply endorsement. */
  ycUrl?: string
}

export const JOB_SOURCES: readonly JobSource[] = [
  { provider: 'greenhouse', board: 'stripe', company: 'Stripe', domain: 'stripe.com', ycUrl: 'https://www.ycombinator.com/companies/stripe' },
  { provider: 'greenhouse', board: 'databricks', company: 'Databricks', domain: 'databricks.com' },
  { provider: 'greenhouse', board: 'cloudflare', company: 'Cloudflare', domain: 'cloudflare.com' },
  { provider: 'greenhouse', board: 'figma', company: 'Figma', domain: 'figma.com' },
  { provider: 'greenhouse', board: 'roblox', company: 'Roblox', domain: 'roblox.com' },
  { provider: 'greenhouse', board: 'duolingo', company: 'Duolingo', domain: 'duolingo.com' },
  { provider: 'greenhouse', board: 'mongodb', company: 'MongoDB', domain: 'mongodb.com' },
  { provider: 'greenhouse', board: 'ripple', company: 'Ripple', domain: 'ripple.com' },
  { provider: 'lever', board: 'wealthsimple', company: 'Wealthsimple', domain: 'wealthsimple.com' },
  { provider: 'lever', board: 'palantir', company: 'Palantir', domain: 'palantir.com' },

  // Startup and growth-stage boards are monitored even when they currently
  // have no internships, so new university roles appear on the next refresh.
  { provider: 'greenhouse', board: 'astranis', company: 'Astranis', domain: 'astranis.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/astranis' },
  { provider: 'greenhouse', board: 'scaleai', company: 'Scale AI', domain: 'scale.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/scale-ai' },
  { provider: 'greenhouse', board: 'gusto', company: 'Gusto', domain: 'gusto.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/gusto' },
  { provider: 'greenhouse', board: 'verkada', company: 'Verkada', domain: 'verkada.com', startup: true },
  { provider: 'greenhouse', board: 'samsara', company: 'Samsara', domain: 'samsara.com' },
  { provider: 'ashby', board: 'notion', company: 'Notion', domain: 'notion.so', startup: true },
  { provider: 'ashby', board: 'replit', company: 'Replit', domain: 'replit.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/replit' },
  { provider: 'ashby', board: 'supabase', company: 'Supabase', domain: 'supabase.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/supabase' },
  { provider: 'ashby', board: 'posthog', company: 'PostHog', domain: 'posthog.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/posthog' },
  { provider: 'ashby', board: 'mintlify', company: 'Mintlify', domain: 'mintlify.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/mintlify' },
  { provider: 'ashby', board: 'resend', company: 'Resend', domain: 'resend.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/resend' },
  { provider: 'ashby', board: 'vapi', company: 'Vapi', domain: 'vapi.ai', startup: true, ycUrl: 'https://www.ycombinator.com/companies/vapi' },
  { provider: 'ashby', board: 'ashby', company: 'Ashby', domain: 'ashbyhq.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/ashby' },
  { provider: 'ashby', board: 'ramp', company: 'Ramp', domain: 'ramp.com', startup: true },
  { provider: 'ashby', board: 'linear', company: 'Linear', domain: 'linear.app', startup: true },
  { provider: 'ashby', board: 'cursor', company: 'Cursor', domain: 'cursor.com', startup: true },
  { provider: 'ashby', board: 'modal', company: 'Modal', domain: 'modal.com', startup: true },
  { provider: 'ashby', board: 'sierra', company: 'Sierra', domain: 'sierra.ai', startup: true },
  { provider: 'ashby', board: 'perplexity', company: 'Perplexity', domain: 'perplexity.ai', startup: true },
  { provider: 'ashby', board: 'baseten', company: 'Baseten', domain: 'baseten.co', startup: true },
  { provider: 'ashby', board: 'zip', company: 'Zip', domain: 'ziphq.com', startup: true, ycUrl: 'https://www.ycombinator.com/companies/zip' },
  { provider: 'ashby', board: 'decagon', company: 'Decagon', domain: 'decagon.ai', startup: true },
  { provider: 'ashby', board: 'browserbase', company: 'Browserbase', domain: 'browserbase.com', startup: true },
  { provider: 'ashby', board: 'exa', company: 'Exa', domain: 'exa.ai', startup: true, ycUrl: 'https://www.ycombinator.com/companies/exa' },
]
export function getEmployer(company: string) {
  const source = JOB_SOURCES.find(source => source.company.toLowerCase() === company.trim().toLowerCase())
  return { startup: source?.startup ?? false, ycUrl: source?.ycUrl ?? null, domain: source?.domain ?? null }
}
export const REFRESH_MS = 3 * 60 * 60 * 1000
export const STALE_MS = 48 * 60 * 60 * 1000
