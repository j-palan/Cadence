import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { updateJobApplication } from '@/lib/db/queries'
import { APPLICATION_STATUSES } from '@/lib/jobs/application-status'
const schema = z.object({ status: z.enum(APPLICATION_STATUSES), resumeId: z.string().uuid().nullable(), notes: z.string().max(2000).default('') })
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success || params.id.length > 200) return NextResponse.json({ error: 'Invalid application.' }, { status: 400 })
  try {
    const row = await updateJobApplication(session.user.id, params.id, body.data)
    if (!row) return NextResponse.json({ error: 'Job or resume not found.' }, { status: 404 })
    return NextResponse.json({ application: { hasSnapshot: !!row.submittedSource, status: row.status, resumeId: row.resumeId, resumeName: row.resumeName, appliedAt: row.appliedAt?.toISOString() ?? null, notes: row.notes } })
  } catch { return NextResponse.json({ error: 'Could not update application. Try again.' }, { status: 503 }) }
}
