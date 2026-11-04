import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getJobApplication } from '@/lib/db/queries'
import { compileLatex } from '@/lib/latex'
export const runtime = 'nodejs'
export const maxDuration = 60
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const application = await getJobApplication(session.user.id, params.id)
  if (!application?.submittedSource) return NextResponse.json({ error: 'No submitted resume recorded.' }, { status: 404 })
  try {
    const compiled = await compileLatex(application.submittedSource)
    if (!compiled.ok) return NextResponse.json({ error: 'Could not compile this snapshot.' }, { status: 422 })
    return new Response(new Uint8Array(compiled.pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="submitted-resume.pdf"', 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'PDF compiler unavailable.' }, { status: 503 }) }
}
