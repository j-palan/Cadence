'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bookmark, ChevronDown, ChevronUp, ExternalLink, Loader2, Target } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { InstantTooltip } from '@/components/ui/instant-tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanyAvatar } from '@/components/jobs/company-avatar'
import { ApplicationTracker } from '@/components/jobs/application-tracker'
import { APPLICATION_LABELS, type JobApplication } from '@/lib/jobs/application-status'
import { filterJobs, groupJobsByCompany, type BoardJob } from '@/lib/jobs/board'
import { formatRelativeTime } from '@/lib/utils'
import { INTERNSHIP_TERMS, jobTerms } from '@/lib/jobs/normalize'

interface Props {
  initialJobId?: string
  jobs: BoardJob[]
  resumes: { id: string; name: string }[]
  selectedResume: string
  hasProfile: boolean
  sources: { total: number; healthy: number; lastChecked: string | null }
}

export function JobsBoard({ jobs, resumes, selectedResume, hasProfile, sources, initialJobId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('all')
  const [term, setTerm] = useState('all')
  const [remote, setRemote] = useState(false)
  const [tab, setTab] = useState('all')
  const [sort, setSort] = useState('fit')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [bookmarks, setBookmarks] = useState<Record<string, boolean>>({})
  const [applications, setApplications] = useState<Record<string, JobApplication>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(initialJobId ?? null)
  const [methodOpen, setMethodOpen] = useState(false)

  const currentJobs = useMemo(() => jobs.map(job => ({ ...job, application: applications[job.id] ?? job.application, term: jobTerms(job).join(' / ') || 'Not specified', saved: bookmarks[job.id] ?? job.saved })), [jobs, bookmarks, applications])
  const filtered = useMemo(() => filterJobs(currentJobs, { search, country, term, remote, savedOnly: tab === 'saved', applicationsOnly: tab === 'applications', sort }), [currentJobs, search, country, term, remote, tab, sort])
  const companies = useMemo(() => groupJobsByCompany(filtered), [filtered])
  const detail = currentJobs.find(job => job.id === detailId)

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

  function jobActions(job: BoardJob, compact = false) {
    return (
      <>
        <Button asChild size={compact ? 'sm' : 'default'} variant={compact ? 'outline' : 'default'}>
          <a href={job.url} target="_blank" rel="noopener noreferrer">
            {job.available ? 'Apply' : 'Employer site'}<ExternalLink aria-hidden="true" />
          </a>
        </Button>
        {selectedResume && job.available ? (
          <InstantTooltip label="Tailor your resume for this role">
          <Button asChild variant={compact ? 'ghost' : 'outline'} size={compact ? 'icon' : 'default'} className={compact ? 'h-9 w-9 shrink-0 gap-0 p-0' : undefined}>
            <Link href={`/resume/${selectedResume}?job=${encodeURIComponent(job.id)}`}>
              <Target aria-hidden="true" /><span className={compact ? 'sr-only' : ''}>Tailor resume{compact ? ` for ${job.title} at ${job.company}` : ''}</span>
            </Link>
          </Button>
          </InstantTooltip>
        ) : null}
        <InstantTooltip label={job.saved ? 'Unsave role' : 'Save role'}>
        <Button
          variant="ghost"
          size={compact ? 'icon' : 'default'}
          className={compact ? 'h-9 w-9 shrink-0 gap-0 p-0' : undefined}
          disabled={saving !== null || (!job.available && !job.saved)}
          aria-pressed={job.saved}
          aria-label={`${job.saved ? 'Unsave' : 'Save'} ${job.title} at ${job.company}`}
          onClick={() => toggleSave(job)}
        >
          {saving === job.id ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Bookmark aria-hidden="true" className={job.saved ? 'fill-current' : ''} />}
          <span className={compact ? 'sr-only' : ''}>{job.saved ? 'Saved' : 'Save'}</span>
        </Button>
        </InstantTooltip>
      </>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/dashboard"><ArrowLeft aria-hidden="true" />Back to resumes</Link>
      </Button>
      <header>
        <h1 className="text-display-sm">Job board</h1>
        <p className="mt-3 text-sm text-muted-foreground">Find internships that fit your resume.</p>
      </header>

      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <Input id="job-search" value={search} placeholder="Company, role, or city" onChange={event => setSearch(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-country" className="text-xs text-muted-foreground">Country</Label>
              <Select id="job-country" value={country} onChange={event => setCountry(event.target.value)}>
                <option value="all">US & Canada</option><option value="US">United States</option><option value="CA">Canada</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-term" className="text-xs text-muted-foreground">Internship term</Label>
              <Select id="job-term" value={term} onChange={event => setTerm(event.target.value)}>
                <option value="all">All terms</option>{INTERNSHIP_TERMS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-sort" className="text-xs text-muted-foreground">Sort by</Label>
              <Select id="job-sort" value={sort} onChange={event => setSort(event.target.value)}>
                <option value="fit">Best resume fit</option><option value="newest">Recently discovered</option>
              </Select>
            </div>
          </div>
          {!hasProfile ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link href={selectedResume ? `/resume/${selectedResume}` : '/resume/new'} className="text-foreground underline underline-offset-4">
                {selectedResume ? 'Add content to your resume' : 'Create a resume'}
              </Link> to see fit scores. No API key needed.
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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

      <Tabs value={tab} onValueChange={setTab} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList aria-label="Job lists">
            <TabsTrigger value="all">Open roles</TabsTrigger>
            <TabsTrigger value="saved">Saved{currentJobs.some(job => job.saved) ? ` (${currentJobs.filter(job => job.saved).length})` : ''}</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
            {pending ? <Loader2 aria-hidden="true" className="animate-spin" /> : null}Refresh matches
          </Button>
        </div>
        <p role="status" className="my-4 text-xs text-muted-foreground">
          {pending ? 'Updating matches…' : `${filtered.length} ${filtered.length === 1 ? 'role' : 'roles'} across ${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
        </p>
        <div className="space-y-4" aria-busy={pending}>
          {companies.map(group => {
            const isExpanded = !!expanded[group.company]
            const preview = isExpanded ? group.jobs : group.jobs.slice(0, 2)
            const remaining = group.jobs.length - 2
            const companyId = `company-${encodeURIComponent(group.company)}`
            return (
              <section key={group.company} aria-label={`${group.company} roles`} className="overflow-hidden rounded-xl border border-border bg-card">
                <header className="flex items-center gap-3 border-b border-border bg-muted/20 px-4 py-3">
                  <CompanyAvatar company={group.company} />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold">{group.company}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{group.jobs.length} {group.jobs.length === 1 ? 'opportunity' : 'opportunities'}</p>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:block">{sort === 'fit' ? 'Best matches first' : 'Newest first'}</span>
                </header>
                <div id={companyId} className="divide-y divide-border">
                  {preview.map(job => (
                    <article key={job.id} className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <button type="button" className="block max-w-full rounded text-left text-sm font-medium leading-snug underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setDetailId(job.id)} aria-label={`View ${job.title} at ${job.company}`}>
                          <h3 className="line-clamp-2">{job.title}</h3>
                        </button>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{job.location}{job.remote ? ' · Remote' : ''}{job.term !== 'Not specified' ? ` · ${job.term}` : ''}</p>
                        {job.application ? <Badge variant="muted" className="mt-1">{APPLICATION_LABELS[job.application.status]}</Badge> : null}
                        {!job.available ? <p className="mt-1 text-xs text-destructive">Closed or no longer verified</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                        <button type="button" className="mr-2 inline-flex min-h-11 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setDetailId(job.id)} aria-label={`View fit evidence for ${job.title} at ${job.company}`}>
                          <Badge variant={job.match.score !== null && job.match.score >= 70 ? 'success' : 'outline'} className="tabular-nums">
                            {job.match.score === null ? 'Unscored' : `${job.match.score}% fit`}
                          </Badge>
                        </button>
                        {jobActions(job, true)}
                      </div>
                    </article>
                  ))}
                </div>
                {remaining > 0 ? (
                  <button type="button" aria-expanded={isExpanded} aria-controls={companyId}
                    className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-border px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    onClick={() => setExpanded(old => ({ ...old, [group.company]: !isExpanded }))}>
                    {isExpanded ? <><ChevronUp aria-hidden="true" className="h-3.5 w-3.5" />Show fewer roles</> : <><ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />{remaining} more {group.company} {remaining === 1 ? 'role' : 'roles'}</>}
                  </button>
                ) : null}
              </section>
            )
          })}
          {!filtered.length ? (
            <div className="rounded-xl border border-dashed border-border px-6 py-20 text-center">
              <h2 className="text-lg font-semibold tracking-tight">{tab === 'saved' ? 'No saved roles here yet' : 'No roles found'}</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {tab === 'saved' ? 'Save a role to come back to it later.' : 'Try broadening your filters. New roles appear as employers publish them.'}
              </p>
            </div>
          ) : null}
        </div>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetailId(null) }}>
        <DialogContent className="max-h-[85dvh] max-w-2xl overflow-y-auto">
          {detail ? <>
            <div className="flex items-start gap-3 pr-6">
              <CompanyAvatar company={detail.company} />
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>{detail.company} · {detail.location}</DialogDescription>
              </DialogHeader>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">{jobActions(detail)}</div>
            <ApplicationTracker key={detail.id} jobId={detail.id} application={detail.application} resumes={resumes} selectedResume={selectedResume} onChange={application => setApplications(current => ({ ...current, [detail.id]: application }))} />
            {!detail.available ? <p className="mt-4 text-sm text-destructive">This role is closed or no longer verified.</p> : null}
            <section className="mt-5 space-y-2 text-sm leading-relaxed" aria-label="Resume fit">
              <Badge variant={detail.match.score !== null && detail.match.score >= 70 ? 'success' : 'outline'}>
                {detail.match.score === null ? 'Unscored' : `${detail.match.score}% resume fit`}
              </Badge>
              {detail.match.score !== null ? <>
                <p><span className="font-medium">Matches: </span>{detail.match.matched.join(', ') || 'No recognized skills in common yet'}</p>
                <p className="text-muted-foreground"><span className="font-medium">No resume evidence: </span>{detail.match.missing.join(', ') || 'All recognized skills found'}</p>
              </> : <p className="text-muted-foreground">{hasProfile ? 'Not enough recognized requirements to calculate a score.' : 'Choose a resume with content to see your match.'}</p>}
              <p className="text-xs text-muted-foreground">{detail.term} · Found {formatRelativeTime(detail.firstSeenAt)} · Checked {formatRelativeTime(detail.checkedAt)}</p>
            </section>
            {detail.match.evidence.length ? (
              <section className="mt-6 border-t border-border pt-5" aria-label="Resume evidence">
                <h3 className="text-sm font-semibold">From your resume</h3>
                <div className="mt-3 space-y-3">
                  {detail.match.evidence.map(item => <p key={item.skill} className="text-xs leading-relaxed text-muted-foreground"><span className="font-medium text-foreground">{item.skill}: </span>…{item.text}…</p>)}
                </div>
              </section>
            ) : null}
            <section className="mt-5 space-y-3 border-t border-border pt-5" aria-label="Requirements and eligibility">
              <h3 className="text-sm font-semibold">Requirements & eligibility</h3>
              {(['required', 'preferred', 'general'] as const).map(importance => {
                const criteria = detail.match.requirements.filter(item => item.importance === importance)
                return criteria.length ? <div key={importance}><p className="text-xs font-medium capitalize">{importance} skills</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{criteria.map(item => `${item.skill}${item.matched ? ' ✓' : ' — no resume evidence'}`).join(' · ')}</p></div> : null
              })}
              {([['graduation', 'Education & graduation'], ['authorization', 'Work authorization'], ['availability', 'Availability']] as const).map(([key, label]) => <div key={key}><p className="text-xs font-medium">{label} · Verify eligibility</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail.match.eligibility[key].join(' ') || 'Not specified in the posting.'}</p></div>)}
              <p className="text-xs text-muted-foreground">Eligibility is separate from the fit score. Remote roles may have geographic restrictions.</p>
            </section>
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
            <p>The score measures recognized technical skills in the posting that appear in your resume. Required skills count 3 points, unspecified skills 2, and preferred skills 1. Section headings and wording determine the category; unrecognized skills are not scored.</p>
            <p>Missing evidence means a skill wasn’t found in this resume. Scores don’t assess proficiency or represent an employer’s ATS score.</p>
            <p>Graduation date, work authorization, and availability are unverified. Review the employer’s requirements before applying.</p>
            <p>After saving changes in the editor, return here and refresh matches to update your scores. Scoring runs without an API key; AI tailoring uses your connected model.</p>
            <p className="text-xs">Employer feeds refresh every 3 hours{sources.lastChecked ? ` · Last checked ${formatRelativeTime(sources.lastChecked)}` : ''}.</p>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  )
}
