import { z } from 'zod'
import { plainText } from './normalize'
import type { JobSource } from './sources'

const greenhouse = z.object({ jobs: z.array(z.object({
  id: z.number(), internal_job_id: z.number().nullable().optional(), title: z.string(),
  location: z.object({ name: z.string() }), absolute_url: z.string(), content: z.string(),
  offices: z.array(z.object({ location: z.string().nullish() })).optional(),
})) })
const lever = z.array(z.object({
  id: z.string(), text: z.string(), hostedUrl: z.string(),
  categories: z.object({ location: z.string().optional(), allLocations: z.array(z.string()).optional() }),
  descriptionPlain: z.string().optional(), description: z.string().optional(),
  lists: z.array(z.object({ text: z.string(), content: z.string() })).optional(),
  additionalPlain: z.string().optional(), workplaceType: z.string().optional(),
}))
const postal = z.object({ addressCountry: z.string().nullish(), addressLocality: z.string().nullish(), addressRegion: z.string().nullish() })
const address = postal.extend({ postalAddress: postal.nullish() })
const ashby = z.object({ jobs: z.array(z.object({
  id: z.string().optional(), title: z.string(), location: z.string(), jobUrl: z.string(),
  isListed: z.boolean(), employmentType: z.string().nullish(),
  isRemote: z.boolean().nullish(), workplaceType: z.string().nullish(),
  descriptionPlain: z.string().nullish(), descriptionHtml: z.string().nullish(),
  address: address.nullish(),
  secondaryLocations: z.array(z.object({ location: z.string(), address: address.nullish() })).optional(),
})) })
export function feedUrl(source: JobSource) {
  switch (source.provider) {
    case 'greenhouse': return `https://boards-api.greenhouse.io/v1/boards/${source.board}/jobs?content=true`
    case 'lever': return `https://api.lever.co/v0/postings/${source.board}?mode=json`
    case 'ashby': return `https://api.ashbyhq.com/posting-api/job-board/${source.board}`
  }
}
function geography(value: z.infer<typeof address> | null | undefined) {
  const location = value?.postalAddress ?? value
  const country = location?.addressCountry
  return [location?.addressLocality, location?.addressRegion, country === 'CA' || country === 'CAN' ? 'Canada' : country === 'US' || country === 'USA' ? 'United States' : country].filter(Boolean).join(', ')
}
export function parseFeed(provider: JobSource['provider'], data: unknown) {
  if (provider === 'greenhouse') return greenhouse.parse(data).jobs.filter(job => job.internal_job_id !== null).map(job => ({
    id: String(job.id), title: job.title, location: job.location.name,
    geo: [job.location.name, ...(job.offices ?? []).map(office => office.location ?? '')].join('; '),
    description: plainText(job.content), url: job.absolute_url, remote: /\bremote\b/i.test(job.location.name), internship: false,
  }))
  if (provider === 'lever') return lever.parse(data).map(job => ({
    id: job.id, title: job.text, location: job.categories.allLocations?.join('; ') || job.categories.location || '',
    geo: job.categories.allLocations?.join('; ') || job.categories.location || '',
    description: plainText([job.descriptionPlain || job.description || '', ...(job.lists ?? []).map(list => `${list.text}\n${list.content}`), job.additionalPlain ?? ''].join('\n\n')),
    url: job.hostedUrl, remote: job.workplaceType === 'remote' || /\bremote\b/i.test(job.categories.location ?? ''), internship: false,
  }))
  return ashby.parse(data).jobs.filter(job => job.isListed).map(job => {
    const locations = [job.location, ...(job.secondaryLocations ?? []).map(location => location.location)]
    return {
      id: job.id ?? job.jobUrl.split('/').filter(Boolean).pop()!, title: job.title,
      location: Array.from(new Set(locations)).join('; '),
      geo: [...locations, geography(job.address), ...(job.secondaryLocations ?? []).map(location => geography(location.address))].join('; '),
      description: plainText(job.descriptionPlain || job.descriptionHtml || ''), url: job.jobUrl,
      // Ashby's isRemote includes hybrid roles; workplaceType is authoritative.
      remote: job.workplaceType === 'Remote', internship: job.employmentType === 'Intern',
    }
  })
}
