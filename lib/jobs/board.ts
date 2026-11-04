import type { Match } from './matching'

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
    && (filters.term === 'all' || job.term === filters.term)
    && (!filters.remote || job.remote)
    && `${job.company} ${job.title} ${job.location}`.toLowerCase().includes(query),
  ).sort((a, b) => {
    const newest = b.firstSeenAt.localeCompare(a.firstSeenAt) || a.id.localeCompare(b.id)
    return filters.sort === 'newest' ? newest : (b.match.score ?? -1) - (a.match.score ?? -1) || newest
  })
}
