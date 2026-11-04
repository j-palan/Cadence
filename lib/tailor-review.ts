import 'server-only'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const schema = z.object({ userId: z.string(), resumeId: z.string().uuid(), copyId: z.string().uuid(), storedHash: z.string(), baseHash: z.string(), source: z.string().max(400000), copyName: z.string().max(120), jobId: z.string().max(200).optional(), expiresAt: z.number() })
export const sourceDigest = (source: string) => createHash('sha256').update(source).digest('hex')
function signature(payload: string) {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is required for edit review.')
  return createHmac('sha256', secret).update(`cadence-tailor-review-v1:${payload}`).digest()
}
export function signTailorReview(input: Omit<z.infer<typeof schema>, 'copyId' | 'expiresAt'>) {
  const payload = Buffer.from(JSON.stringify({ ...input, copyId: randomUUID(), expiresAt: Date.now() + 15 * 60000 })).toString('base64url')
  return `${payload}.${signature(payload).toString('base64url')}`
}
export function verifyTailorReview(token: string, userId: string, resumeId: string) {
  if (token.length > 2000000) throw new Error('Invalid review.')
  const parts = token.split('.')
  if (parts.length !== 2) throw new Error('Invalid review.')
  const actual = Buffer.from(parts[1], 'base64url')
  const expected = signature(parts[0])
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('Invalid review.')
  const review = schema.parse(JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')))
  if (review.userId !== userId || review.resumeId !== resumeId || review.expiresAt < Date.now()) throw new Error('This review has expired. Generate a fresh preview.')
  return review
}
