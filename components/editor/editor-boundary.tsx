'use client'

import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * Keeps a CodeMirror crash from taking the user's content with it.
 *
 * The fallback is a plain textarea wired to the same value and change handler,
 * so editing continues (and autosave keeps firing) even with the rich editor
 * broken.
 */
interface Props {
  value: string
  onChange: (next: string) => void
  children: ReactNode
}

interface State {
  failed: boolean
}

export class EditorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[editor] falling back to plain textarea', error)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div className="flex h-full flex-col">
        <p className="flex items-center gap-2 border-b border-border bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" />
          The syntax editor crashed. Your content is intact — editing continues here.
        </p>
        <textarea
          value={this.props.value}
          onChange={(event) => this.props.onChange(event.target.value)}
          spellCheck={false}
          className="flex-1 resize-none bg-background p-3 font-mono text-xs leading-relaxed focus:outline-none"
        />
      </div>
    )
  }
}
