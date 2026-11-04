import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { syncJobs } from '@/lib/jobs/sync'
export const runtime = 'nodejs'
export const maxDuration = 120

/** Scheduler only. No user-triggered endpoint can force employer refreshes. */
export async function POST(request: Request) {
  const secret = process.env.JOBS_SYNC_SECRET
  const expected = Buffer.from(`Bearer ${secret ?? ''}`)
  const actual = Buffer.from(request.headers.get('authorization') ?? '')
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  try {
    const results = await syncJobs()
    return NextResponse.json({ results }, { status: results.some(r => r.status === 'failed') ? 207 : 200 })
  } catch {
    return NextResponse.json({ error: 'Job refresh unavailable.' }, { status: 503 })
  }
}
