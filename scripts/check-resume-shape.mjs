#!/usr/bin/env node
/**
 * Audit a resume .tex against the layout rules the prompts promise:
 * bullets per entry, characters per bullet, and (given a PDF) page count.
 *
 * Usage: node scripts/check-resume-shape.mjs <file.tex> [file.pdf]
 */
import { readFile } from 'node:fs/promises'

// Measured from a real one-page resume in this template: the widest rendered
// line is 113 characters, median 101. See scripts/measure-resume-pdf.mjs.
const ONE_LINE = 110
const TWO_LINES = 220
const MAX_RENDERED_LINES = 70

const tex = await readFile(process.argv[2], 'utf8')

// Split into entries at each subheading/project heading, keeping the label.
const blocks = []
const headingRe = /\\resume(SubHeading|Subheading|ProjectHeading)\s*(\{[^\n]*)/g
let match
const marks = []
while ((match = headingRe.exec(tex))) {
  if (match[1] === 'SubHeading') continue // list start/end wrappers
  marks.push({ index: match.index, kind: match[1], label: match[2].slice(0, 60) })
}
for (const [i, m] of marks.entries()) {
  const end = i + 1 < marks.length ? marks[i + 1].index : tex.length
  blocks.push({ ...m, body: tex.slice(m.index, end) })
}

const strip = (s) => s.replace(/\\[a-zA-Z]+\s*/g, '').replace(/[{}$\\]/g, '').trim()
const bulletsIn = (body) =>
  [...body.matchAll(/\\resumeItem\{((?:[^{}]|\{[^{}]*\})*)\}/g)].map((m) => strip(m[1]))

let fails = 0
const note = (ok, msg) => {
  if (!ok) fails += 1
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`)
}

// Entries with no bullets (Education uses \resumeSubheading too) are not scored,
// and must not shift which role counts as "most recent".
const scored = blocks
  .map((b) => ({ ...b, bullets: bulletsIn(b.body) }))
  .filter((b) => b.bullets.length > 0)
const firstJobIndex = scored.findIndex((b) => b.kind !== 'ProjectHeading')

console.log('Bullets per entry:')
for (const [index, b] of scored.entries()) {
  const bullets = b.bullets
  const isProject = b.kind === 'ProjectHeading'
  // The most recent role may carry a sixth bullet.
  const [lo, hi] = isProject ? [1, 2] : [4, index === firstJobIndex ? 6 : 5]
  const label = b.label.replace(/[{}\\]/g, '').split('$')[0].trim().slice(0, 34)
  note(
    bullets.length >= lo && bullets.length <= hi,
    `${(isProject ? 'project' : 'job').padEnd(7)} ${label.padEnd(36)} ${bullets.length} bullets (want ${lo}-${hi})`,
  )
}

console.log('\nBullet lengths:')
const all = scored.flatMap((b) => b.bullets)
const over1 = all.filter((t) => t.length > ONE_LINE)
const over2 = all.filter((t) => t.length > TWO_LINES)
console.log(`  ${all.length} bullets · longest ${Math.max(0, ...all.map((t) => t.length))} chars`)
note(over2.length === 0, `${over2.length} exceed two lines (>${TWO_LINES} chars)`)
console.log(`  – ${over1.length} run to a second line (>${ONE_LINE} chars)`)
for (const t of over2.slice(0, 3)) console.log(`      ${t.length}: ${t.slice(0, 90)}…`)

if (process.argv[3]) {
  // Ask pdf.js rather than regexing the file: Tectonic emits compressed object
  // streams, so /Count and /Type /Page are not in the plaintext.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const data = new Uint8Array(await readFile(process.argv[3]))
  const doc = await pdfjs.getDocument({ data, useSystemFonts: false }).promise
  console.log('\nCompiled PDF:')
  note(doc.numPages === 1, `${doc.numPages} page(s) (want exactly 1)`)

  // Group extracted text by baseline Y to count real rendered lines and find the
  // widest one — the only honest way to check the line budget.
  const page = await doc.getPage(1)
  const rows = new Map()
  for (const item of (await page.getTextContent()).items) {
    if (!item.str?.trim()) continue
    const y = Math.round(item.transform[5])
    rows.set(y, (rows.get(y) ?? '') + item.str)
  }
  const widths = [...rows.values()].map((t) => t.replace(/\s+/g, ' ').trim().length)
  note(rows.size <= MAX_RENDERED_LINES, `${rows.size} rendered lines (want <= ${MAX_RENDERED_LINES})`)
  console.log(`  – widest rendered line: ${Math.max(0, ...widths)} chars`)
  await doc.loadingTask?.destroy().catch(() => {})
}

console.log(`\n${fails === 0 ? 'PASS' : `FAIL — ${fails} violation(s)`}`)
process.exit(fails === 0 ? 0 : 1)
