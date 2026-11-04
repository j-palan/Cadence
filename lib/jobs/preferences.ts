import { z } from 'zod'

const schema = z.object({
  version: z.literal(1), resumeId: z.string().max(100), search: z.string().max(200),
  country: z.enum(['all', 'US', 'CA']), term: z.enum(['all', 'Winter', 'Summer', 'Fall']),
  remote: z.boolean(), tab: z.enum(['all', 'saved', 'applications']), sort: z.enum(['fit', 'newest']),
  employer: z.enum(['all', 'startup', 'yc']).default('all'),
  expanded: z.record(z.string().max(100), z.boolean()).refine(value => Object.keys(value).length <= 100),
  scroll: z.number().finite().min(0).max(1000000),
})
export function parseBoardPreferences(raw: string | null) {
  if (!raw || raw.length > 20000) return null
  try { const result = schema.safeParse(JSON.parse(raw)); return result.success ? result.data : null } catch { return null }
}
export const boardPreferencesKey = (userId: string) => `cadence:job-board:v1:${userId}`
