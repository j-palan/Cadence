/** Local-only extraction: files stay in the browser until the user imports. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const MAX_IMPORTED_CHARS = 120000
export function validateResumeFile(name: string, size: number) {
  const extension = name.toLowerCase().split('.').pop()
  if (!['pdf', 'docx', 'txt', 'tex'].includes(extension ?? '')) throw new Error('Choose a PDF, DOCX, TXT, or TEX file.')
  if (!size || size > MAX_UPLOAD_BYTES) throw new Error('Choose a non-empty file smaller than 5 MB.')
  return extension as 'pdf' | 'docx' | 'txt' | 'tex'
}
export function validateImportedText(text: string) {
  const cleaned = text.replace(/\u0000/g, '').trim()
  if (cleaned.length < 50) throw new Error('No usable resume text found. For scanned PDFs, paste the text from an OCR tool instead.')
  if (cleaned.length > MAX_IMPORTED_CHARS) throw new Error('This document is too long. Import only the resume pages.')
  return cleaned
}
function validateDocxArchive(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  let end = -1
  for (let offset = view.byteLength - 22; offset >= Math.max(0, view.byteLength - 65557); offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) { end = offset; break }
  }
  if (end < 0) throw new Error('This DOCX file is damaged.')
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  let expanded = 0
  if (count > 512) throw new Error('This DOCX file contains too many embedded files.')
  for (let i = 0; i < count; i++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) throw new Error('This DOCX file is damaged.')
    expanded += view.getUint32(offset + 24, true)
    if (expanded > 30 * 1024 * 1024) throw new Error('This DOCX file expands beyond the import limit.')
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true)
  }
}
export async function extractResumeFile(file: File): Promise<{ text: string; latex: boolean }> {
  const extension = validateResumeFile(file.name, file.size)
  if (extension === 'tex' || extension === 'txt') return { text: validateImportedText(await file.text()), latex: extension === 'tex' }
  const arrayBuffer = await file.arrayBuffer()
  if (extension === 'docx') {
    validateDocxArchive(arrayBuffer)
    const mammoth = await import('mammoth/mammoth.browser')
    const result = await mammoth.extractRawText({ arrayBuffer })
    return { text: validateImportedText(result.value), latex: false }
  }
  if (new TextDecoder().decode(arrayBuffer.slice(0, 5)) !== '%PDF-') throw new Error('This file is not a valid PDF.')
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  const task = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) })
  try {
    const document = await task.promise
    if (document.numPages > 10) throw new Error('Import a resume with 10 pages or fewer.')
    const pages: string[] = []
    for (let page = 1; page <= document.numPages; page++) {
      const content = await (await document.getPage(page)).getTextContent()
      pages.push(content.items.map(item => 'str' in item ? item.str + (item.hasEOL ? '\n' : ' ') : '').join(''))
    }
    return { text: validateImportedText(pages.join('\n\n')), latex: false }
  } finally { await task.destroy() }
}
