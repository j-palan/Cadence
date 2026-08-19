import 'server-only'

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { DEFAULT_TEMPLATE, TEMPLATE_IDS, type TemplateId } from './meta'

// The .tex files are read from disk rather than inlined so they stay editable
// as plain LaTeX. `outputFileTracingIncludes` in next.config.mjs keeps them in
// the deployment bundle.
const cache = new Map<TemplateId, string>()

export function getTemplateSource(id: string = DEFAULT_TEMPLATE): string {
  const templateId: TemplateId = (TEMPLATE_IDS as readonly string[]).includes(id)
    ? (id as TemplateId)
    : DEFAULT_TEMPLATE

  const cached = cache.get(templateId)
  if (cached) return cached

  const source = readFileSync(
    join(process.cwd(), 'lib', 'templates', `${templateId}.tex`),
    'utf8',
  )
  cache.set(templateId, source)
  return source
}
