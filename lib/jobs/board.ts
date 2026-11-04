import type { Match } from './matching'
import { jobTerms } from './normalize'

export interface BoardJob {
  id: string
  company: string
  title: string
  location: string
  countries: string[]
  remote: boolean
  term: string
  description: string
  url: string
  firstSeenAt: string
  checkedAt: string
  available: boolean
  saved: boolean
  match: Match
}

export interface BoardFilters {
  search: string
  country: string
  term: string
  remote: boolean
  savedOnly: boolean
  sort: string
}

export function filterJobs(jobs: BoardJob[], filters: BoardFilters): BoardJob[] {
  const query = filters.search.trim().toLowerCase()
  return jobs.filter(job =>
    (filters.savedOnly ? job.saved : job.available)
    && (filters.country === 'all' || job.countries.includes(filters.country))
    && (filters.term === 'all' || jobTerms(job).some(term => term === filters.term))
    && (!filters.remote || job.remote)
    && `${job.company} ${job.title} ${job.location}`.toLowerCase().includes(query),
  ).sort((a, b) => {
    const newest = b.firstSeenAt.localeCompare(a.firstSeenAt) || a.id.localeCompare(b.id)
    return filters.sort === 'newest' ? newest : (b.match.score ?? -1) - (a.match.score ?? -1) || newest
  })
}

/** Keep each company's best/newest role first, preserving the selected sort. */
export function groupJobsByCompany(sortedJobs: BoardJob[]): { company: string; jobs: BoardJob[] }[] {
  const groups = new Map<string, { company: string; jobs: BoardJob[] }>()
  for (const job of sortedJobs) {
    const key = job.company.trim().toLowerCase()
    const group = groups.get(key)
    if (group) group.jobs.push(job)
    else groups.set(key, { company: job.company, jobs: [job] })
  }
  return Array.from(groups.values())
}
