import 'server-only'

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export interface RateLimitResult {
  success: boolean
  /** Seconds until the caller may retry. Zero when not limited. */
  retryAfter: number
}

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
)

// One generation per 10 seconds per user, per the launch checklist.
const limiter = configured
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(1, '10 s'),
      prefix: 'cadence:generate',
      analytics: false,
    })
  : null

let warned = false

/**
 * Rate limit a user's generation requests.
 *
 * With no Upstash credentials this is a no-op, which keeps local development
 * running without a Redis account. Production should always have them set —
 * `/api/generate` is the one route that costs real money per call.
 */
export async function limitGenerate(userId: string): Promise<RateLimitResult> {
  if (!limiter) {
    if (!warned) {
      warned = true
      const message =
        'Upstash is not configured — /api/generate is running unthrottled. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.'
      if (process.env.NODE_ENV === 'production') console.error(message)
      else console.warn(message)
    }
    return { success: true, retryAfter: 0 }
  }

  const { success, reset } = await limiter.limit(userId)
  return {
    success,
    retryAfter: success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
  }
}
