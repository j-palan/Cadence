'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useTheme } from 'next-themes'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint'
import { githubDark, githubLight } from '@uiw/codemirror-theme-github'
import { EditorView } from '@codemirror/view'

import {
  compilerErrorsToSourceDiagnostics,
  findStructuralLatexErrors,
} from '@/lib/latex-diagnostics'
import type { LatexError } from '@/lib/latex-client'

export function CodePane({
  value,
  onChange,
  readOnly = false,
  onSave,
  errors = [],
  jumpTarget = null,
}: {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  /** Cmd/Ctrl+S and Cmd/Ctrl+Enter, the two chords Overleaf users reach for. */
  onSave?: () => void
  errors?: LatexError[]
  jumpTarget?: { line: number; request: number } | null
}) {
  const { resolvedTheme } = useTheme()
  const viewRef = useRef<EditorView | null>(null)
  const extensions = useMemo(
    () => [
      StreamLanguage.define(stex),
      EditorView.lineWrapping,
      lintGutter(),
      linter(
        (view) => [
          ...findStructuralLatexErrors(view.state.doc.toString()),
          ...compilerErrorsToSourceDiagnostics(view.state.doc.toString(), errors),
        ] as Diagnostic[],
        { delay: 200 },
      ),
    ],
    [errors],
  )

  useEffect(() => {
    const view = viewRef.current
    if (!view || !jumpTarget) return
    const line = view.state.doc.line(Math.min(jumpTarget.line, view.state.doc.lines))
    view.dispatch({
      selection: { anchor: line.from },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    })
    view.focus()
  }, [jumpTarget])

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={resolvedTheme === 'dark' ? githubDark : githubLight}
      extensions={extensions}
      editable={!readOnly}
      onCreateEditor={(view) => {
        viewRef.current = view
      }}
      onChange={onChange}
      onKeyDown={(event) => {
        if ((event.metaKey || event.ctrlKey) && (event.key === 's' || event.key === 'Enter')) {
          event.preventDefault()
          onSave?.()
        }
      }}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: !readOnly,
        bracketMatching: true,
        closeBrackets: true,
        // LaTeX autocomplete would need a macro corpus to be useful; the
        // generic word-completer just gets in the way.
        autocompletion: false,
      }}
      className="h-full text-[13px]"
    />
  )
}
