// Measure the real typeset geometry: group extracted text by baseline Y to get
// actual rendered lines, so the char-per-line budget is observed, not guessed.
import { readFile } from 'node:fs/promises'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const data = new Uint8Array(await readFile(process.argv[2]))
const doc = await pdfjs.getDocument({ data, useSystemFonts: false }).promise
console.log('pages:', doc.numPages)

const page = await doc.getPage(1)
const vp = page.getViewport({ scale: 1 })
console.log(`page box: ${Math.round(vp.width)} x ${Math.round(vp.height)} pt`)

const content = await page.getTextContent()
const lines = new Map()
for (const item of content.items) {
  if (!item.str) continue
  const y = Math.round(item.transform[5])
  const x = item.transform[4]
  if (!lines.has(y)) lines.set(y, [])
  lines.get(y).push({ x, str: item.str })
}

const rendered = [...lines.entries()]
  .sort((a, b) => b[0] - a[0])
  .map(([y, parts]) => ({
    y,
    text: parts.sort((a, b) => a.x - b.x).map((p) => p.str).join('').replace(/\s+/g, ' ').trim(),
    left: Math.min(...parts.map((p) => p.x)),
  }))
  .filter((l) => l.text.length > 0)

console.log('rendered lines on page 1:', rendered.length)

// Bullet lines start at the itemize indent; find the deepest common left edge.
const bulletLines = rendered.filter((l) => l.left > 40 && l.text.length > 20)
const widest = [...bulletLines].sort((a, b) => b.text.length - a.text.length).slice(0, 8)
console.log('\nlongest rendered lines (this is the one-line budget):')
for (const l of widest) console.log(`  ${String(l.text.length).padStart(3)}  ${l.text.slice(0, 96)}`)

const lens = bulletLines.map((l) => l.text.length).sort((a, b) => a - b)
console.log('\nindented line lengths: median', lens[Math.floor(lens.length/2)], '| p90', lens[Math.floor(lens.length*0.9)], '| max', lens[lens.length-1])
console.log('vertical span used:', Math.round(rendered[0].y - rendered[rendered.length-1].y), 'pt of', Math.round(vp.height))
