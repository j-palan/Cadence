import type { LatexError } from './latex-client'

export interface SourceDiagnostic {
  from: number
  to: number
  message: string
  severity: 'error' | 'warning'
  source: 'Cadence' | 'LaTeX'
}

const VERBATIM_ENVIRONMENTS = new Set(['verbatim', 'verbatim*', 'lstlisting', 'minted'])

function isEscaped(source: string, index: number): boolean {
  let slashes = 0
  for (let cursor = index - 1; cursor >= 0 && source[cursor] === '\\'; cursor -= 1) slashes += 1
  return slashes % 2 === 1
}

function lineEnd(source: string, index: number): number {
  const end = source.indexOf('\n', index)
  return end === -1 ? source.length : end
}

/** Fast structural checks that can run on every editor change without invoking TeX. */
export function findStructuralLatexErrors(source: string): SourceDiagnostic[] {
  const diagnostics: SourceDiagnostic[] = []
  const delimiters: { char: '{' | '['; position: number }[] = []
  const environments: { name: string; position: number }[] = []
  let verbatimEnvironment: string | null = null

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '%' && !isEscaped(source, index)) {
      index = lineEnd(source, index)
      continue
    }

    if (source[index] !== '\\') {
      if (verbatimEnvironment) continue

      const char = source[index]
      if ((char === '{' || char === '[') && !isEscaped(source, index)) {
        delimiters.push({ char, position: index })
      } else if ((char === '}' || char === ']') && !isEscaped(source, index)) {
        const expected = char === '}' ? '{' : '['
        const opener = delimiters.at(-1)
        if (opener?.char === expected) {
          delimiters.pop()
        } else {
          diagnostics.push({
            from: index,
            to: index + 1,
            message: `Unexpected \`${char}\`. Remove it or add the matching \`${expected}\` before it.`,
            severity: 'error',
            source: 'Cadence',
          })
        }
      }
      continue
    }

    const environment = source.slice(index).match(/^\\(begin|end)\{([^{}]+)\}/)
    if (!environment) continue

    const [, command, name] = environment
    if (command === 'begin') {
      environments.push({ name, position: index })
      if (VERBATIM_ENVIRONMENTS.has(name)) verbatimEnvironment = name
    } else if (verbatimEnvironment === name) {
      environments.pop()
      verbatimEnvironment = null
    } else if (!verbatimEnvironment) {
      const opener = environments.at(-1)
      if (opener?.name === name) {
        environments.pop()
      } else {
        diagnostics.push({
          from: index,
          to: index + environment[0].length,
          message: opener
            ? `Expected \\end{${opener.name}} before \\end{${name}}.`
            : `There is no matching \\begin{${name}}.`,
          severity: 'error',
          source: 'Cadence',
        })
      }
    }

    index += environment[0].length - 1
  }

  for (const delimiter of delimiters.slice(-25)) {
    const closer = delimiter.char === '{' ? '}' : ']'
    diagnostics.push({
      from: delimiter.position,
      to: delimiter.position + 1,
      message: `Missing closing \`${closer}\` for this \`${delimiter.char}\`.`,
      severity: 'error',
      source: 'Cadence',
    })
  }

  for (const environment of environments.slice(-25)) {
    diagnostics.push({
      from: environment.position,
      to: Math.min(source.length, environment.position + `\\begin{${environment.name}}`.length),
      message: `Missing \\end{${environment.name}}.`,
      severity: 'error',
      source: 'Cadence',
    })
  }

  return diagnostics.slice(0, 50)
}

export function compilerErrorsToSourceDiagnostics(
  source: string,
  errors: LatexError[],
): SourceDiagnostic[] {
  const lines = source.split('\n')
  const lineStarts: number[] = []
  let offset = 0
  for (const line of lines) {
    lineStarts.push(offset)
    offset += line.length + 1
  }

  return errors.flatMap((error) => {
    if (!error.line || error.line < 1 || error.line > lines.length) return []
    const from = lineStarts[error.line - 1]
    const length = lines[error.line - 1].length
    return [{
      from,
      to: Math.max(from + 1, from + length),
      message: error.message,
      severity: 'error' as const,
      source: 'LaTeX' as const,
    }]
  })
}
