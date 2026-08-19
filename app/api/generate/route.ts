import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import {
  MAX_LOG_CHARS,
  describeClaudeError,
  streamResumeSource,
  stripCodeFences,
} from '@/lib/claude'
import {
  createLogImport,
  createResume,
  getLatestLogImport,
  getResume,
  updateResume,
} from '@/lib/db/queries'
import { limitGenerate } from '@/lib/ratelimit'
import { DEFAULT_TEMPLATE, isTemplateId } from '@/lib/templates/meta'
import { getTemplateSource } from '@/lib/templates/server'

// Generation can run well past the default limit on a long log.
export const maxDuration = 120

const bodySchema = z
  .object({
    /** Required when creating; optional when regenerating an existing resume. */
    log: z.string().trim().max(MAX_LOG_CHARS).optional(),
    template: z.string().refine(isTemplateId, 'Unknown template.').default(DEFAULT_TEMPLATE),
    name: z.string().trim().min(1).max(120).optional(),
    /** Present when regenerating rather than creating. */
    resumeId: z.string().uuid().optional(),
  })
  .refine(
    (body) => Boolean(body.resumeId) || (body.log?.length ?? 0) >= 20,
    'Add a bit more log content first.',
  )

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

  const { template, name, resumeId } = parsed.data

  // A regenerate must resolve to a row the caller actually owns.
  let existing = null
  if (resumeId) {
    existing = await getResume(userId, resumeId)
    if (!existing) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    }
  }

  // On a regenerate with no log in the body, fall back to the log already
  // stored for this resume. The client never gets to name the source content.
  let log = parsed.data.log ?? ''
  let logIsNew = log.length > 0

  if (!logIsNew && existing) {
    const stored = await getLatestLogImport(userId, existing.id)
    if (!stored) {
      return NextResponse.json(
        { error: 'No log is stored for this resume. Import one from /resume/new.' },
        { status: 409 },
      )
    }
    log = stored.rawContent
  }

  if (log.trim().length < 20) {
    return NextResponse.json({ error: 'The log is too short to work with.' }, { status: 400 })
  }

  // Rate limit before the Claude call — this is the route that costs money.
  const limit = await limitGenerate(userId)
  if (!limit.success) {
    return NextResponse.json(
      { error: `Slow down — try again in ${limit.retryAfter}s.` },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  const templateSource = getTemplateSource(existing?.template ?? template)
  const encoder = new TextEncoder()
  let assembled = ''

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamResumeSource({
          log,
          templateSource,
          existingSource: existing?.latexSource ?? null,
        })) {
          assembled += chunk
          controller.enqueue(encoder.encode(chunk))
        }

        const latexSource = stripCodeFences(assembled)

        // Persist only once the stream completed, so a dropped connection never
        // leaves a half-written document behind.
        const resume = existing
          ? await updateResume(userId, existing.id, { latexSource })
          : await createResume(userId, { name, template, latexSource })

        // Only record a log the user actually just supplied — a regenerate off
        // the stored log would otherwise duplicate it on every run.
        if (resume && logIsNew) {
          await createLogImport(userId, { resumeId: resume.id, rawContent: log })
        }

        // A trailer tells the client which row to navigate to. The marker is a
        // LaTeX comment, so a client that ignores it still holds a valid document.
        controller.enqueue(encoder.encode(`\n%%cadence:resume-id:${resume?.id ?? ''}%%`))
        controller.close()
      } catch (error) {
        const { message } = describeClaudeError(error)
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
