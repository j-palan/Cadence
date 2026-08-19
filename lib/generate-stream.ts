/**
 * Client-side reader for /api/generate.
 *
 * The route streams LaTeX as it arrives and appends a trailing marker comment
 * carrying either the new resume's id or an error message — headers are long
 * gone by the time generation can fail, so the outcome has to ride the body.
 */
const ID_MARKER = /%%cadence:resume-id:([0-9a-f-]*)%%/i
const ERROR_MARKER = /%%cadence:error:([\s\S]*?)%%/i

export interface GenerateStreamResult {
  source: string
  resumeId: string | null
  error: string | null
}

export function splitMarkers(raw: string): GenerateStreamResult {
  const idMatch = raw.match(ID_MARKER)
  const errorMatch = raw.match(ERROR_MARKER)

  const source = raw.replace(ID_MARKER, '').replace(ERROR_MARKER, '').trim()

  return {
    source,
    resumeId: idMatch?.[1] ? idMatch[1] : null,
    error: errorMatch?.[1] ? errorMatch[1] : null,
  }
}

export async function readGenerateStream(
  response: Response,
  onChunk: (sourceSoFar: string) => void,
): Promise<GenerateStreamResult> {
  if (!response.body) throw new Error('The server returned an empty response.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break

    raw += decoder.decode(value, { stream: true })
    // Strip markers before display so a marker never flashes in the editor.
    onChunk(splitMarkers(raw).source)
  }

  raw += decoder.decode()
  return splitMarkers(raw)
}
