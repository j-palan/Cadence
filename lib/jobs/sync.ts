import 'server-only'
import { z } from 'zod'
import { claimJobSource, finishJobSource, failJobSource, listJobSources } from '@/lib/db/queries'
import { JOB_SOURCES, REFRESH_MS } from './sources'
import { countriesFor, internshipTerm, isSweIntern, plainText, safeJobUrl } from './normalize'
import type { Job } from '@/lib/db/schema'

const greenhouseSchema = z.object({ jobs: z.array(z.object({
  id: z.number(), internal_job_id: z.number().nullable().optional(), title: z.string(),
  location: z.object({ name: z.string() }), absolute_url: z.string(), content: z.string(),
  offices: z.array(z.object({ location: z.string().nullable().optional() })).optional(),
})) })
const leverSchema = z.array(z.object({
  id: z.string(), text: z.string(), hostedUrl: z.string(),
  categories: z.object({ location: z.string().optional(), allLocations: z.array(z.string()).optional() }),
  descriptionPlain: z.string().optional(), description: z.string().optional(),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).optional(),
  additionalPlain: z.string().optional(), workplaceType: z.string().optional(),
}))
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
  for (let i = 0; i < due.length; i += 4) {
    results.push(...await Promise.all(due.slice(i, i + 4).map(async source => {
      const sourceId = `${source.provider}:${source.board}`
      if (!await claimJobSource(null, sourceId, REFRESH_MS)) return { source: sourceId, status: 'skipped' as const }
      try {
        const url = source.provider === 'greenhouse'
          ? `https://boards-api.greenhouse.io/v1/boards/${source.board}/jobs?content=true`
          : `https://api.lever.co/v0/postings/${source.board}?mode=json`
        const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } })
        if (!response.ok) throw new Error('Feed unavailable')
        const data: unknown = await response.json()
        const raw = source.provider === 'greenhouse'
          ? greenhouseSchema.parse(data).jobs.filter(j => j.internal_job_id !== null).map(j => ({ id: String(j.id), title: j.title, location: j.location.name, geo: [j.location.name, ...(j.offices ?? []).map(o => o.location ?? '')].join('; '), description: plainText(j.content), url: j.absolute_url, remote: /\bremote\b/i.test(j.location.name) }))
          : leverSchema.parse(data).map(j => ({ id: j.id, title: j.text, location: j.categories.allLocations?.join('; ') || j.categories.location || '', geo: j.categories.allLocations?.join('; ') || j.categories.location || '', description: plainText([j.descriptionPlain || j.description || '', ...(j.lists ?? []).map(l => `${l.text}\n${l.content}`), j.additionalPlain ?? ''].join('\n\n')), url: j.hostedUrl, remote: j.workplaceType === 'remote' || /\bremote\b/i.test(j.categories.location ?? '') }))
        const checkedAt = new Date()
        const postings: (Omit<Job, 'firstSeenAt'>)[] = []
        for (const job of raw) {
          const countries = countriesFor(job.geo)
          const url = safeJobUrl(job.url)
          if (!isSweIntern(job.title) || !countries.length || !url || job.description.length < 50) continue
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
