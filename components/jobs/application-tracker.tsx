'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { APPLICATION_STATUSES, APPLICATION_LABELS, type ApplicationStatus, type JobApplication } from '@/lib/jobs/application-status'

export function ApplicationTracker({ jobId, application, resumes, selectedResume, onChange }: {
  jobId: string; application?: JobApplication | null; resumes: { id: string; name: string }[]; selectedResume: string; onChange: (application: JobApplication) => void
}) {
  const [status, setStatus] = useState<ApplicationStatus>(application?.status ?? 'saved')
  const [resumeId, setResumeId] = useState(application?.resumeId ?? selectedResume)
  const [notes, setNotes] = useState(application?.notes ?? '')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  async function save() {
    setPending(true); setMessage('')
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/application`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, resumeId: resumeId || null, notes }) })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Could not save application.')
      onChange(body.application); setMessage('Application saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save application.') }
    finally { setPending(false) }
  }
  return <section className="mt-5 space-y-3 border-t border-border pt-5" aria-label="Application tracking">
    <h3 className="text-sm font-semibold">Your application</h3>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="application-status">Status</Label><Select id="application-status" value={status} disabled={pending} onChange={event => setStatus(event.target.value as ApplicationStatus)}>{APPLICATION_STATUSES.map(value => <option key={value} value={value}>{APPLICATION_LABELS[value]}</option>)}</Select></div>
      <div className="space-y-1.5"><Label htmlFor="application-resume">Resume used</Label><Select id="application-resume" value={resumeId} disabled={pending || !!application?.appliedAt} onChange={event => setResumeId(event.target.value)}><option value="">Not recorded</option>{application?.resumeId && !resumes.some(resume => resume.id === application.resumeId) ? <option value={application.resumeId}>{application.resumeName ?? 'Submitted resume'}</option> : null}{resumes.map(resume => <option key={resume.id} value={resume.id}>{resume.name}</option>)}</Select></div>
    </div>
    {application?.appliedAt ? <p className="text-xs text-muted-foreground">Submitted {new Date(application.appliedAt).toLocaleDateString()} · {application.resumeName ?? 'No resume recorded'}{application.resumeName ? <> · <a className="underline underline-offset-4" href={`/api/jobs/${encodeURIComponent(jobId)}/application/resume`}>Download submitted resume</a></> : null}</p> : <p className="text-xs text-muted-foreground">Marking Applied or Interviewing records a snapshot of the selected resume.</p>}
    <Label htmlFor="application-notes" className="block">Notes</Label><Textarea id="application-notes" value={notes} maxLength={2000} disabled={pending} onChange={event => setNotes(event.target.value)} placeholder="Interview dates, contacts, or reminders" />
    <Button variant="outline" onClick={save} disabled={pending}>{pending ? 'Saving…' : 'Save application'}</Button>
    {message ? <p role="status" className="text-xs text-muted-foreground">{message}</p> : null}
  </section>
}
