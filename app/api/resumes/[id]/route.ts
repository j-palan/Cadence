import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { deleteResume, updateResume } from '@/lib/db/queries'
import { isTemplateId } from '@/lib/templates/meta'

const paramsSchema = z.object({ id: z.string().uuid() })

const patchSchema = z
  .object({
    latexSource: z.string().max(400_000).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    template: z.string().refine(isTemplateId, 'Unknown template.').optional(),
  })
  .refine((body) => Object.keys(body).length > 0, 'Nothing to update.')

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const id = paramsSchema.safeParse(params)
  if (!id.success) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  // Ownership rides in the where clause; a null return covers both
  // "no such row" and "not yours".
  const resume = await updateResume(session.user.id, id.data.id, parsed.data)
  if (!resume) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  return NextResponse.json({ updatedAt: resume.updatedAt })
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const id = paramsSchema.safeParse(params)
  if (!id.success) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const deleted = await deleteResume(session.user.id, id.data.id)
  if (!deleted) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}
