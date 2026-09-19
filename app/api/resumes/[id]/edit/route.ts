import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { resolveEngine } from '@/lib/ai/engine'
import { createLogImport, getResume, updateResumeSource } from '@/lib/db/queries'
import { describeGenerationError, MAX_EXISTING_SOURCE_CHARS, MAX_LOG_CHARS } from '@/lib/generate'
import { generateResumeEdits } from '@/lib/generate-edits'
import { compileLatex, EngineNotFoundError } from '@/lib/latex'
import { limitGenerate } from '@/lib/ratelimit'
import { applyResumeEdits } from '@/lib/resume-edits'

export const runtime = 'nodejs'
export const maxDuration = 120

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  instruction: z.string().trim().min(2).max(4_000),
  source: z.string().min(1).max(MAX_EXISTING_SOURCE_CHARS),
  jobDescription: z.string().trim().min(50).max(20_000).optional(),
  workLog: z.string().trim().min(20).max(MAX_LOG_CHARS).optional(),
})

type RequiredEntry = { label: string; employer: string; title: string }

function normalized(value: string): string {
  return value
    .toLowerCase()
    .replace(/\\&/g, '&')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** Pull structured "Company — Title" headings from an agent-maintained log. */
function requiredNewEntries(workLog: string, source: string): RequiredEntry[] {
  const normalizedSource = normalized(source)
  const entries: RequiredEntry[] = []

  for (const line of workLog.split(/\r?\n/)) {
    const match = line.match(/^#{2,4}\s+(.+?)\s+(?:—|–|\|)\s+(.+?)\s*$/)
    if (!match) continue

    const employer = match[1].trim()
    const title = match[2].trim()
    if (/^(new|existing)\s+(experience|context|accomplishments?)/i.test(employer)) continue

    const employerPresent = normalizedSource.includes(normalized(employer))
    const titlePresent = normalizedSource.includes(normalized(title))
    if (!employerPresent || !titlePresent) {
      entries.push({ label: `${employer} — ${title}`, employer, title })
    }
  }

  return entries
}

function missingEntries(source: string, entries: RequiredEntry[]): RequiredEntry[] {
  const normalizedSource = normalized(source)
  return entries.filter((entry) =>
    !normalizedSource.includes(normalized(entry.employer)) ||
    !normalizedSource.includes(normalized(entry.title)),
  )
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

  const id = paramsSchema.safeParse(params)
  const body = bodySchema.safeParse(await request.json().catch(() => null))
  if (!id.success) return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  if (!body.success) {
    return NextResponse.json(
      { error: body.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const existing = await getResume(session.user.id, id.data.id)
  if (!existing) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })

  const limit = await limitGenerate(session.user.id)
  if (!limit.success) {
    return NextResponse.json(
      { error: `Slow down — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  try {
    const engine = await resolveEngine(session.user.id)
    const requiredEntries = body.data.workLog
      ? requiredNewEntries(body.data.workLog, body.data.source)
      : []
    const plan = await generateResumeEdits(
      body.data.source,
      body.data.instruction,
      engine,
      { jobDescription: body.data.jobDescription, workLog: body.data.workLog },
    )
    let latexSource = applyResumeEdits(body.data.source, plan.edits)
    let message = plan.message
    const edits = [...plan.edits]

    let missing = missingEntries(latexSource, requiredEntries)
    if (body.data.workLog && missing.length > 0) {
      const retry = await generateResumeEdits(
        latexSource,
        `Add these missing roles to the Experience section now: ${missing.map((entry) => entry.label).join('; ')}. Preserve their employer, title, location, dates, and strongest supplied accomplishments. Do not make any other changes.`,
        engine,
        { workLog: body.data.workLog },
      )
      latexSource = applyResumeEdits(latexSource, retry.edits)
      edits.push(...retry.edits)
      message = `${plan.message} ${retry.message}`.trim()
      missing = missingEntries(latexSource, requiredEntries)
    }

    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `The update did not add the required new role${missing.length === 1 ? '' : 's'} (${missing.map((entry) => entry.label).join(', ')}), so nothing was saved. Try again or add the role with Ask AI.`,
        },
        { status: 422 },
      )
    }

    const compiled = await compileLatex(latexSource)

    if (!compiled.ok) {
      return NextResponse.json(
        {
          error: 'The suggested edit did not compile, so your resume was left unchanged.',
          errors: compiled.errors,
        },
        { status: 422 },
      )
    }

    if (latexSource !== body.data.source) {
      const saved = await updateResumeSource(session.user.id, existing.id, latexSource)
      if (!saved) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    }
    if (body.data.workLog) {
      await createLogImport(session.user.id, { resumeId: existing.id, rawContent: body.data.workLog })
    }

    return NextResponse.json({
      source: latexSource,
      message,
      editCount: edits.length,
      changes: edits.map((edit) => ({ before: edit.find, after: edit.replace })),
    })
  } catch (error) {
    if (error instanceof EngineNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 503 })
    }
    const { status, message } = describeGenerationError(error)
    const apiKeyRequired = message.includes('API key')
    return NextResponse.json(
      { error: message, ...(apiKeyRequired ? { code: 'API_KEY_REQUIRED' } : {}) },
      { status },
    )
  }
}
