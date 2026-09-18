interface CachedPreview {
  source: string
  pdf: Blob
  engine: string | null
}

// Module state survives client-side navigation while keeping compiled PDFs out
// of persistent storage. The cap avoids retaining every opened resume forever.
const previews = new Map<string, CachedPreview>()
const MAX_PREVIEWS = 4

export function getCachedPreview(resumeId: string, source: string): CachedPreview | null {
  const cached = previews.get(resumeId)
  if (!cached || cached.source !== source) return null

  previews.delete(resumeId)
  previews.set(resumeId, cached)
  return cached
}

export function setCachedPreview(
  resumeId: string,
  source: string,
  pdf: Blob,
  engine: string | null,
) {
  previews.delete(resumeId)
  previews.set(resumeId, { source, pdf, engine })

  while (previews.size > MAX_PREVIEWS) {
    const oldest = previews.keys().next().value
    if (oldest === undefined) break
    previews.delete(oldest)
  }
}
