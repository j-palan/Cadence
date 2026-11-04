'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, ExternalLink, Loader2, Target } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { filterJobs, type BoardJob } from '@/lib/jobs/board'
import { formatRelativeTime } from '@/lib/utils'

interface Props {
  jobs: BoardJob[]
  resumes: { id: string; name: string }[]
  selectedResume: string
  hasProfile: boolean
  sources: { total: number; healthy: number; lastChecked: string | null }
}

export function JobsBoard({ jobs, resumes, selectedResume, hasProfile, sources }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [term, setTerm] = useState('all')
  const [remote, setRemote] = useState(false)
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('fit')
  const [limit, setLimit] = useState(30)
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [methodOpen, setMethodOpen] = useState(false)

  const currentJobs = useMemo(() => jobs.map(job => ({ ...job, saved: bookmarks[job.id] ?? job.saved })), [jobs, bookmarks])
  const filtered = useMemo(() => filterJobs(currentJobs, { search, country, term, remote, savedOnly: tab === 'saved', sort }), [currentJobs, search, country, term, remote, tab, sort])
  const detail = currentJobs.find(job => job.id === detailId)
  const terms = Array.from(new Set(jobs.map(job => job.term))).sort()

  async function toggleSave(job: BoardJob) {
    setSaving(job.id)
    setError(null)
    const saved = !job.saved
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(job.id)}/save`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ saved }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save this job.')
      setBookmarks(old => ({ ...old, [job.id]: saved }))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save this job. Try again.')
    } finally {
      setSaving(null)
    }
  }

  function jobActions(job: BoardJob) {
    return (
      <>
        <Button asChild>
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {job.available ? 'Apply' : 'Employer site'}<ExternalLink aria-hidden="true" />
          </a>
        </Button>
        {selectedResume && job.available ? (
          <Button asChild variant="outline">
            <Link href={`/resume/${selectedResume}?job=${encodeURIComponent(job.id)}`}>
              <Target aria-hidden="true" />Tailor resume
            </Link>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          disabled={saving !== null || (!job.available && !job.saved)}
          aria-pressed={job.saved}
          aria-label={`${job.saved ? 'Unsave' : 'Save'} ${job.title} at ${job.company}`}
          onClick={() => toggleSave(job)}
        >
          {saving === job.id ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Bookmark aria-hidden="true" className={job.saved ? 'fill-current' : ''} />}
          {job.saved ? 'Saved' : 'Save'}
        </Button>
      </>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/dashboard"><ArrowLeft aria-hidden="true" />Back to resumes</Link>
      </Button>
      <header>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Your next role</p>
        <h1 className="text-display-sm mt-2">SWE internships</h1>
        <p className="mt-3 text-sm text-muted-foreground">US and Canada · Direct employer postings · Matched to your resume</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Checked every 3 hours{sources.lastChecked ? ` · Last checked ${formatRelativeTime(sources.lastChecked)}` : ''}
        </p>
      </header>

      <Card className="mt-10">
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="match-resume" className="text-xs text-muted-foreground">Match against</Label>
              <Select id="match-resume" value={selectedResume} disabled={!resumes.length || pending}
                onChange={event => startTransition(() => router.replace(`/jobs?resume=${encodeURIComponent(event.target.value)}`, { scroll: false }))}>
                {!resumes.length ? <option value="">No resume yet</option> : null}
                {resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-search" className="text-xs text-muted-foreground">Search roles</Label>
              <Input id="job-search" value={search} placeholder="Company, role, or city" onChange={event => { setSearch(event.target.value); setLimit(30) }} />
            </div>
          </div>
          {!hasProfile ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href={selectedResume ? `/resume/${selectedResume}` : '/resume/new'} className="text-foreground underline underline-offset-4">
                {selectedResume ? 'Add content to your resume' : 'Create a resume'}
              </Link> to see fit scores. No API key needed.
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-country" className="text-xs text-muted-foreground">Country</Label>
              <Select id="job-country" value={country} onChange={event => setCountry(event.target.value)}>
                <option value="all">US & Canada</option><option value="US">United States</option><option value="CA">Canada</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-term" className="text-xs text-muted-foreground">Internship term</Label>
              <Select id="job-term" value={term} onChange={event => setTerm(event.target.value)}>
                <option value="all">All terms</option>{terms.map(value => <option key={value}>{value}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-sort" className="text-xs text-muted-foreground">Sort by</Label>
              <Select id="job-sort" value={sort} onChange={event => setSort(event.target.value)}>
                <option value="fit">Best resume fit</option><option value="newest">Recently discovered</option>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
              <Checkbox checked={remote} onCheckedChange={checked => setRemote(checked === true)} />Remote roles only
            </label>
            <Button variant="link" size="sm" onClick={() => setMethodOpen(true)}>How fit scores work</Button>
          </div>
        </CardContent>
      </Card>

      {sources.healthy < sources.total ? (
        <p role="status" className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {sources.healthy === 0 ? 'Employer feeds are temporarily unavailable. Please check back shortly.' : `${sources.healthy} of ${sources.total} employer feeds are up to date. Showing the latest verified results; listings older than 48 hours are hidden.`}
        </p>
      ) : null}
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}

      <Tabs value={tab} onValueChange={value => { setTab(value); setLimit(30) }} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList aria-label="Job lists">
            <TabsTrigger value="all">Open roles</TabsTrigger>
            <TabsTrigger value="saved">Saved{currentJobs.some(job => job.saved) ? ` (${currentJobs.filter(job => job.saved).length})` : ''}</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Refresh matches
          </Button>
        </div>
        <p role="status" className="my-4 text-xs text-muted-foreground">
          {pending ? 'Updating matches…' : `${filtered.length} ${filtered.length === 1 ? 'role' : 'roles'}`}
        </p>
        <div className="space-y-4" aria-busy={pending}>
          {filtered.slice(0, limit).map(job => (
            <article key={job.id} className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-foreground/20">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{job.company}</p>
                  <h2 className="mt-1 text-sm font-semibold">{job.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{job.location}{job.remote ? ' · Remote' : ''}</p>
                </div>
                <Badge variant="outline" className="shrink-0">{job.match.score === null ? 'Unscored' : `${job.match.score}% fit`}</Badge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{job.term} · Found {formatRelativeTime(job.firstSeenAt)} · Checked {formatRelativeTime(job.checkedAt)}</p>
              {!job.available ? <p className="mt-3 text-xs text-destructive">Closed or no longer verified. Check the employer’s site for availability.</p> : null}
              <div className="mt-4 space-y-1.5 text-xs leading-relaxed">
                {job.match.score !== null ? (
                  <>
                    <p><span className="font-medium">Matches: </span>{job.match.matched.join(', ') || 'No recognized skills in common yet'}</p>
                    <p className="text-muted-foreground"><span className="font-medium">No resume evidence: </span>{job.match.missing.join(', ') || 'All recognized skills found'}</p>
                  </>
                ) : <p className="text-muted-foreground">{hasProfile ? 'Not enough recognized requirements to calculate a score.' : 'Choose a resume with content to see your match.'}</p>}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {jobActions(job)}
                <Button variant="link" size="sm" onClick={() => setDetailId(job.id)} aria-label={`View ${job.title} at ${job.company}`}>View posting</Button>
              </div>
            </article>
          ))}
          {!filtered.length ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
              <h2 className="text-lg font-semibold tracking-tight">{tab === 'saved' ? 'No saved roles here yet' : 'No internships found'}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {tab === 'saved' ? 'Save a role to come back to it later.' : 'Try broadening your filters. New roles appear as employers publish them.'}
              </p>
            </div>
          ) : null}
        </div>
      </Tabs>
      {filtered.length > limit ? <div className="mt-6 text-center"><Button variant="outline" onClick={() => setLimit(value => value + 30)}>Show more roles</Button></div> : null}

      <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetailId(null) }}>
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          {detail ? <>
            <DialogHeader>
              <DialogTitle>{detail.title}</DialogTitle>
              <DialogDescription>{detail.company} · {detail.location}</DialogDescription>
            </DialogHeader>
            <div className="mt-5 flex flex-wrap gap-2">{jobActions(detail)}</div>
            {!detail.available ? <p className="mt-4 text-sm text-destructive">This role is closed or no longer verified.</p> : null}
            {detail.match.evidence.length ? (
              <section className="mt-6 border-t border-border pt-5" aria-label="Resume evidence">
                <h3 className="text-sm font-semibold">From your resume</h3>
                <div className="mt-3 space-y-3">
                  {detail.match.evidence.map(item => <p key={item.skill} className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{item.skill}: </span>…{item.text}…</p>)}
                </div>
              </section>
            ) : null}
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Eligibility unverified: graduation date, work authorization, and availability. Remote roles may have geographic restrictions.</p>
            <section className="mt-5 border-t border-border pt-5" aria-label="Job description">
              <h3 className="text-sm font-semibold">Job description</h3>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{detail.description}</p>
            </section>
          </> : null}
        </DialogContent>
      </Dialog>
      <Dialog open={methodOpen} onOpenChange={setMethodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>How fit scores work</DialogTitle>
            <DialogDescription>A guide to the evidence in your resume, not a prediction of hiring outcomes.</DialogDescription>
          </DialogHeader>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>The score is the percentage of recognized technical skills in the posting that also appear in your selected resume. Required and preferred skills count equally. Unrecognized requirements are not scored.</p>
            <p>Missing evidence means a skill wasn’t found in this resume. Scores don’t assess proficiency or represent an employer’s ATS score.</p>
            <p>Graduation date, work authorization, and availability are unverified. Review the employer’s requirements before applying.</p>
            <p>After saving changes in the editor, return here and refresh matches to update your scores. Scoring runs without an API key; AI tailoring uses your connected model.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
