import 'server-only'
import { claimJobSource, finishJobSource, failJobSource, listJobSources } from '@/lib/db/queries'
import { JOB_SOURCES, REFRESH_MS } from './sources'
import { countriesFor, internshipTerm, isSweIntern, safeJobUrl } from './normalize'
import type { Job } from '@/lib/db/schema'
import { feedUrl, parseFeed } from './feed'

export async function syncJobs() {
  const states = await listJobSources(null)
  const now = Date.now()
  const due = JOB_SOURCES.filter(source => {
    const state = states.find(state => state.id === `${source.provider}:${source.board}`)
    return !state || (state.leaseUntil.getTime() < now
      && now - state.attemptedAt.getTime() >= 15 * 60000
      && (!state.checkedAt || now - state.checkedAt.getTime() >= REFRESH_MS))
  })
  const results: { source: string; status: 'updated' | 'skipped' | 'failed'; count?: number }[] = []
  // Bound concurrency and timeouts so employer outages cannot exhaust requests.
  const started = Date.now()
  for (let i = 0; i < due.length && Date.now() - started < 75000; i += 6) {
    results.push(...await Promise.all(due.slice(i, i + 6).map(async source => {
      const sourceId = `${source.provider}:${source.board}`
      if (!await claimJobSource(null, sourceId, REFRESH_MS)) return { source: sourceId, status: 'skipped' as const }
      try {
        const response = await fetch(feedUrl(source), { cache: 'no-store', signal: AbortSignal.timeout(10000), headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('Feed unavailable')
        const raw = parseFeed(source.provider, await response.json())
        const checkedAt = new Date()
        const postings: (Omit<Job, 'firstSeenAt'>)[] = []
        for (const job of raw) {
          const countries = countriesFor(job.geo)
          const url = safeJobUrl(job.url)
          if (!isSweIntern(job.title, job.internship, job.description) || !countries.length || !url || job.description.length < 50) continue
          postings.push({ id: `${sourceId}:${job.id}`, sourceId, company: source.company, title: job.title,
            location: job.location, countries, remote: job.remote, term: internshipTerm(job.title),
            description: job.description, url, checkedAt, active: true })
        }
        await finishJobSource(null, sourceId, checkedAt, postings)
        return { source: sourceId, status: 'updated' as const, count: postings.length }
      } catch {
        await failJobSource(null, sourceId)
        return { source: sourceId, status: 'failed' as const }
      }
    })))
  }
  return results
}
