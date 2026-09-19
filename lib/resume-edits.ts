import { z } from 'zod'

export const resumeEditResponseSchema = z.object({
  message: z.string().trim().min(1).max(500),
  edits: z.array(z.object({
    find: z.string().min(1).max(20_000),
    replace: z.string().max(20_000),
  })).max(30),
})

export type ResumeEdit = z.infer<typeof resumeEditResponseSchema>['edits'][number]

/** Parse JSON even when a provider ignores the no-fences instruction. */
export function parseResumeEditResponse(raw: string) {
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = unfenced.indexOf('{')
  const end = unfenced.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('The model did not return a valid edit plan.')

  try {
    return resumeEditResponseSchema.parse(JSON.parse(unfenced.slice(start, end + 1)))
  } catch {
    throw new Error('The model returned an invalid edit plan. Try phrasing the request differently.')
  }
}

/**
 * Apply guarded replacements. Each target must exist exactly once at the time
 * it is applied, otherwise guessing could silently modify the wrong section.
 */
export function applyResumeEdits(source: string, edits: ResumeEdit[]): string {
  if (edits.length === 0) return source
  let next = source

  for (const edit of edits) {
    const first = next.indexOf(edit.find)
    const second = first < 0 ? -1 : next.indexOf(edit.find, first + edit.find.length)
    if (first < 0) throw new Error('An AI edit targeted text that is no longer in the resume. Try again.')
    if (second >= 0) {
      throw new Error('An AI edit matched more than one place, so it was not applied. Be more specific.')
    }
    next = `${next.slice(0, first)}${edit.replace}${next.slice(first + edit.find.length)}`
  }

  if (next === source) throw new Error('The requested edit did not change the resume.')
  return next
}
