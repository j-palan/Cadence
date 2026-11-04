import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { saveJob } from '@/lib/db/queries'
const schema = z.object({ saved: z.boolean() })
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success || params.id.length > 200) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  try {
    if (!await saveJob(session.user.id, params.id, body.data.saved)) return NextResponse.json({ error: 'This role is no longer available.' }, { status: 409 })
    return NextResponse.json({ saved: body.data.saved })
  } catch { return NextResponse.json({ error: 'Could not save this job. Try again.' }, { status: 503 }) }
}
