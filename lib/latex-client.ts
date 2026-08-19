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
