/**
 * Types shared between the compile route and the editor. Kept out of
 * `lib/latex.ts` because that module is `server-only` — importing it from a
 * client component for a type alias would pull the whole thing in.
 */
export interface LatexError {
  line: number | null
  message: string
}

export interface CompileFailureBody {
  error: string
  log?: string
  errors?: LatexError[]
  engineMissing?: boolean
}

/**
 * Strip the ```latex fences a model sometimes wraps its output in despite being
 * told not to.
 *
 * Isomorphic on purpose: the server strips before persisting, and the client
 * strips the streamed text before it reaches the editor. Skipping the client
 * side would put a fence into the document and break the next compile.
 */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^\s*```(?:latex|tex)?\s*\n?/i, '')
    .replace(/\n?\s*```\s*$/i, '')
    .trim()
}
