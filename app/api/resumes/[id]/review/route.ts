import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { createTailoredResume, getResume, linkTailoredJobResume } from '@/lib/db/queries'
import { sourceDigest, verifyTailorReview } from '@/lib/tailor-review'
const schema = z.object({ token: z.string().max(2000000) })
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const body = schema.safeParse(await request.json().catch(() => null))
  if (!body.success) return NextResponse.json({ error: 'Invalid review.' }, { status: 400 })
  try {
    const review = verifyTailorReview(body.data.token, session.user.id, params.id)
    let copy = await getResume(session.user.id, review.copyId)
    if (!copy) {
      const original = await getResume(session.user.id, params.id)
      if (!original) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
      const current = sourceDigest(original.latexSource)
      if (current !== review.storedHash && current !== review.baseHash) return NextResponse.json({ error: 'The original changed. Generate a fresh preview before accepting.' }, { status: 409 })
      copy = await createTailoredResume(session.user.id, params.id, review.source, review.copyName, review.copyId)
    }
    if (!copy) return NextResponse.json({ error: 'Resume not found.' }, { status: 404 })
    if (review.jobId) await linkTailoredJobResume(session.user.id, review.jobId, copy.id)
    return NextResponse.json({ resumeId: copy.id })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && /expired|Invalid review/.test(error.message) ? error.message : 'Could not accept this review. Generate a fresh preview.' }, { status: 400 })
  }
}
