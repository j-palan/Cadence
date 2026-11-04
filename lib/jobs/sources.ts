export const JOB_SOURCES = [
  { provider: 'greenhouse', board: 'stripe', company: 'Stripe' },
  { provider: 'greenhouse', board: 'databricks', company: 'Databricks' },
  { provider: 'greenhouse', board: 'cloudflare', company: 'Cloudflare' },
  { provider: 'greenhouse', board: 'figma', company: 'Figma' },
  { provider: 'greenhouse', board: 'roblox', company: 'Roblox' },
  { provider: 'greenhouse', board: 'duolingo', company: 'Duolingo' },
  { provider: 'greenhouse', board: 'mongodb', company: 'MongoDB' },
  { provider: 'greenhouse', board: 'ripple', company: 'Ripple' },
  { provider: 'lever', board: 'wealthsimple', company: 'Wealthsimple' },
  { provider: 'lever', board: 'palantir', company: 'Palantir' },
] as const
export const REFRESH_MS = 3 * 60 * 60 * 1000
export const STALE_MS = 48 * 60 * 60 * 1000
