import { NextResponse } from 'next/server'
import { z } from 'zod'

import { auth } from '@/auth'
import { getResume } from '@/lib/db/queries'
import { EngineNotFoundError, MAX_SOURCE_CHARS, compileLatex } from '@/lib/latex'
import { slugifyFilename } from '@/lib/utils'

// A TeX engine is a native binary — this cannot run on the edge, and a cold
// package fetch on the first Tectonic run takes a while.
export const runtime = 'nodejs'
export const maxDuration = 120

const bodySchema = z.object({
  resumeId: z.string().uuid(),
  /**
   * Unsaved editor content. Autosave may not have fired yet, so the client
   * hands over what is on screen — it is compiled, never stored.
   */
  source: z.string().max(MAX_SOURCE_CHARS).optional(),
  /** `download` sets Content-Disposition; `preview` renders inline. */
  mode: z.enum(['preview', 'download']).default('preview'),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // The client supplies the source, but the resume must be theirs — otherwise
  // this becomes a free LaTeX compile service for anyone with an account.
  const resume = await getResume(session.user.id, parsed.data.resumeId)
  if (!resume) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 })
  }

  const source = parsed.data.source?.trim() ? parsed.data.source : resume.latexSource
  if (!source.trim()) {
    return NextResponse.json({ error: 'This document is empty.' }, { status: 400 })
  }

  try {
    const result = await compileLatex(source)

    if (!result.ok) {
      // A LaTeX error is an expected outcome, not a server fault. 422 carries
      // the log so the editor can show it the way Overleaf does.
      return NextResponse.json(
        { error: 'Compilation failed.', log: result.log, errors: result.errors },
        { status: 422 },
      )
    }

    const filename = `${slugifyFilename(resume.name)}.pdf`

    return new NextResponse(new Uint8Array(result.pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition':
          parsed.data.mode === 'download'
            ? `attachment; filename="${filename}"`
            : `inline; filename="${filename}"`,
        'Content-Length': String(result.pdf.byteLength),
        'Cache-Control': 'no-store',
        'X-Cadence-Engine': result.engine,
        'X-Cadence-Duration-Ms': String(result.durationMs),
      },
    })
  } catch (error) {
    console.error('[compile]', error)

    if (error instanceof EngineNotFoundError) {
      return NextResponse.json({ error: error.message, engineMissing: true }, { status: 503 })
    }

    const timedOut = error instanceof Error && error.message.includes('timed out')
    return NextResponse.json(
      {
        error:
          error instanceof Error && timedOut
            ? error.message
            : 'Compilation failed unexpectedly.',
      },
      { status: timedOut ? 504 : 500 },
    )
  }
}
