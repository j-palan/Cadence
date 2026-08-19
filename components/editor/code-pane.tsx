'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

export function CodePane({
  value,
  onChange,
  readOnly = false,
  onSave,
}: {
  value: string
  onChange: (next: string) => void
  readOnly?: boolean
  /** Cmd/Ctrl+S and Cmd/Ctrl+Enter, the two chords Overleaf users reach for. */
  onSave?: () => void
}) {
  const extensions = useMemo(
    () => [StreamLanguage.define(stex), EditorView.lineWrapping],
    [],
  )

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={oneDark}
      extensions={extensions}
      editable={!readOnly}
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
