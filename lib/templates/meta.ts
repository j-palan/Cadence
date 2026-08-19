/**
 * Template metadata. Isomorphic — safe to import from client components.
 * The .tex source is read on the server only (see `./server.ts`).
 *
 * There is one template for now. The registry shape stays so adding a second
 * .tex file is a data change rather than a refactor.
 */

export const TEMPLATE_IDS = ['jake'] as const

export type TemplateId = (typeof TEMPLATE_IDS)[number]

export const DEFAULT_TEMPLATE: TemplateId = 'jake'

export interface TemplateMeta {
  id: TemplateId
  name: string
  description: string
  credit?: { label: string; href: string }
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'jake',
    name: "Jake's Resume",
    description:
      'The widely-used single-column LaTeX resume. Small-caps section rules, tight spacing, ATS-parsable output.',
    credit: {
      label: 'Jake Gutierrez · MIT',
      href: 'https://github.com/jakegut/resume',
    },
  },
]

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === 'string' && (TEMPLATE_IDS as readonly string[]).includes(value)
}

export function templateName(id: string): string {
  return TEMPLATES.find((t) => t.id === id)?.name ?? id
}
