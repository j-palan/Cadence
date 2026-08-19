import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { createResume } from '@/lib/db/queries'
import { DEFAULT_TEMPLATE, isTemplateId } from '@/lib/templates/meta'
import { getTemplateSource } from '@/lib/templates/server'

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  template: z.string().refine(isTemplateId, 'Unknown template.').default(DEFAULT_TEMPLATE),
})

/**
 * Create a resume straight from the template, with no AI involved.
 *
 * This is the "just give me Jake's resume to edit" path — the editor opens
 * preloaded with the template source rather than a blank document.
 */
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const resume = await createResume(session.user.id, {
    name: parsed.data.name,
    template: parsed.data.template,
    latexSource: getTemplateSource(parsed.data.template),
  })

  return NextResponse.json({ id: resume.id }, { status: 201 })
}
