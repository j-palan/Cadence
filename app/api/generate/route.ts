import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import {
  MAX_CUSTOM_INSTRUCTIONS_CHARS,
  MAX_JOB_DESCRIPTION_CHARS,
  MAX_LOG_CHARS,
  describeGenerationError,
  resolveEngine,
  streamResumeSource,
  stripCodeFences,
} from '@/lib/generate'
import {
  createLogImport,
  createResume,
  getLatestLogImport,
  getResume,
  updateResume,
} from '@/lib/db/queries'
import { isGenerationMode, type GenerationMode } from '@/lib/prompts'
import { limitGenerate } from '@/lib/ratelimit'
import { DEFAULT_TEMPLATE, isTemplateId } from '@/lib/templates/meta'
import { getTemplateSource } from '@/lib/templates/server'

// Generation can run well past the default limit on a long log.
export const maxDuration = 120

const MIN_LOG_CHARS = 20

const bodySchema = z.object({
  mode: z
    .string()
    .refine(isGenerationMode, 'Unknown mode.')
    .default('create' satisfies GenerationMode),
  /** Required for `create`; optional for `update` (falls back to the stored log). */
  log: z.string().trim().max(MAX_LOG_CHARS).optional(),
  /** Required for `tailor`. */
  jobDescription: z.string().trim().max(MAX_JOB_DESCRIPTION_CHARS).optional(),
  /** Free-text guidance from the user; overrides the layout defaults. */
  customInstructions: z.string().trim().max(MAX_CUSTOM_INSTRUCTIONS_CHARS).optional(),
  template: z.string().refine(isTemplateId, 'Unknown template.').default(DEFAULT_TEMPLATE),
  name: z.string().trim().min(1).max(120).optional(),
  /** Required for `update` and `tailor`. */
  resumeId: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  // Authorization is the session, never the request body.
  const userId = session.user.id

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { mode, template, name, resumeId, jobDescription, customInstructions } = parsed.data

  // `update` and `tailor` act on an existing document, so they need one — and it
  // must be one the caller owns.
  let existing = null
  if (mode === 'update' || mode === 'tailor') {
    if (!resumeId) {
      return NextResponse.json(
        { error: `The ${mode} mode needs an existing resume.` },
        { status: 400 },
      )
    }
    existing = await getResume(userId, resumeId)
    if (!existing) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    }
    if (!existing.latexSource.trim()) {
      return NextResponse.json({ error: 'This resume is empty.' }, { status: 409 })
    }
  }

  if (mode === 'tailor' && (jobDescription?.length ?? 0) < 50) {
    return NextResponse.json(
      { error: 'Paste the job description first.' },
      { status: 400 },
    )
  }

  // Resolve the log for the modes that read one. On `update` with no log in the
  // body, fall back to what was stored for this resume — the client never gets
  // to name the source content.
  let log = parsed.data.log ?? ''
  const logIsNew = log.length > 0

  if (mode === 'update' && !logIsNew && existing) {
    const stored = await getLatestLogImport(userId, existing.id)
    if (!stored) {
      return NextResponse.json(
        { error: 'No log is stored for this resume. Paste one to update from.' },
        { status: 409 },
      )
    }
    log = stored.rawContent
  }

  if (mode !== 'tailor' && log.trim().length < MIN_LOG_CHARS) {
    return NextResponse.json(
      { error: 'Add a bit more log content first.' },
      { status: 400 },
    )
  }

  // Rate limit before the Claude call — this is the route that costs money.
  const limit = await limitGenerate(userId)
  if (!limit.success) {
    return NextResponse.json(
      { error: `Slow down — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  // Own key if the user configured one, otherwise Cadence's default.
  let engine
  try {
    engine = await resolveEngine(userId)
  } catch (error) {
    const { status, message } = describeGenerationError(error)
    return NextResponse.json({ error: message }, { status })
  }

  const encoder = new TextEncoder()
  let assembled = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamResumeSource(
          {
            mode,
            log: mode === 'tailor' ? undefined : log,
            templateSource: mode === 'create' ? getTemplateSource(template) : undefined,
            existingSource: existing?.latexSource ?? null,
            jobDescription: mode === 'tailor' ? jobDescription : undefined,
            customInstructions,
          },
          engine,
        )) {
          assembled += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        const latexSource = stripCodeFences(assembled)

        // Persist only once the stream completed, so a dropped connection never
        // leaves a half-written document behind.
        const resume = existing
          ? await updateResume(userId, existing.id, { latexSource })
          : await createResume(userId, { name, template, latexSource })

        // Only record a log the user actually just supplied — updating off the
        // stored log would otherwise duplicate it on every run.
        if (resume && logIsNew) {
          await createLogImport(userId, { resumeId: resume.id, rawContent: log })
        }

        // A trailer tells the client which row to navigate to. The marker is a
        // LaTeX comment, so a client that ignores it still holds a valid document.
        controller.enqueue(encoder.encode(`\n%%cadence:resume-id:${resume?.id ?? ''}%%`))
        controller.close()
      } catch (error) {
        const { message } = describeGenerationError(error)
        console.error('[generate]', error)
        // Headers are already sent, so the error has to ride the body.
        controller.enqueue(encoder.encode(`\n%%cadence:error:${message}%%`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Accel-Buffering': 'no',
    },
  })
}
