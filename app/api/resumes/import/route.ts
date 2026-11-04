import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { createResume, DuplicateResumeNameError } from '@/lib/db/queries'
const schema = z.object({ name: z.string().trim().min(1).max(120), source: z.string().min(50).max(120000) })
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success || !body.data.source.includes('\\begin{document}') || !body.data.source.includes('\\end{document}')) return NextResponse.json({ error: 'Upload a complete LaTeX resume with a document environment.' }, { status: 400 })
  try {
    const resume = await createResume(session.user.id, { name: body.data.name, template: 'jake', latexSource: body.data.source })
    return NextResponse.json({ id: resume.id }, { status: 201 })
  } catch (error) {
    if (error instanceof DuplicateResumeNameError) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ error: 'Could not import this resume.' }, { status: 503 })
  }
}
