import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { resolveEngine } from '@/lib/ai/engine'
import { getResume, updateResumeSource } from '@/lib/db/queries'
import { describeGenerationError, MAX_EXISTING_SOURCE_CHARS } from '@/lib/generate'
import { generateResumeEdits } from '@/lib/generate-edits'
import { compileLatex, EngineNotFoundError } from '@/lib/latex'
import { limitGenerate } from '@/lib/ratelimit'
import { applyResumeEdits } from '@/lib/resume-edits'

export const runtime = 'nodejs'
export const maxDuration = 120

const paramsSchema = z.object({ id: z.string().uuid() })
const bodySchema = z.object({
  instruction: z.string().trim().min(2).max(2_000),
  source: z.string().min(1).max(MAX_EXISTING_SOURCE_CHARS),
})

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
    const plan = await generateResumeEdits(body.data.source, body.data.instruction, engine)
    const latexSource = applyResumeEdits(body.data.source, plan.edits)
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

    const saved = await updateResumeSource(session.user.id, existing.id, latexSource)
    if (!saved) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })

    return NextResponse.json({
      source: latexSource,
      message: plan.message,
      editCount: plan.edits.length,
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
