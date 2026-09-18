'use client'

import { useEffect, useRef, useState } from 'react'
import { Bot, Loader2, Send, Undo2, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export interface ResumeChatMessage {
  id: number
  role: 'user' | 'assistant' | 'error'
  text: string
  changes?: Array<{ before: string; after: string }>
}

export function ResumeChatPanel({
  onClose,
  messages,
  pending,
  canUndo,
  onSubmit,
  onUndo,
}: {
  onClose: () => void
  messages: ResumeChatMessage[]
  pending: boolean
  canUndo: boolean
  onSubmit: (instruction: string) => void
  onUndo: () => void
}) {
  const [instruction, setInstruction] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = messagesRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [messages, pending])

  function submit() {
    const value = instruction.trim()
    if (!value || pending) return
    setInstruction('')
    onSubmit(value)
  }

  return (
    <aside className="flex h-full min-w-0 flex-col bg-background">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <Bot className="h-4 w-4 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Edit with AI</p>
          <p className="truncate text-[10px] text-muted-foreground">Targeted edits · compile checked</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          disabled={pending}
          aria-label="Close AI chat"
        >
          <X />
        </Button>
      </header>

      <div ref={messagesRef} className="m-3 mb-0 min-h-0 flex-1 space-y-4 overflow-y-auto rounded-xl border-2 border-input bg-card px-3 py-4">
          {messages.length === 0 ? (
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="rounded-lg border border-border bg-muted/30 p-3 leading-relaxed">
                Ask for a change and keep watching the PDF. Cadence changes only the matching source
                and verifies the result before saving.
              </div>
              <p className="font-medium text-foreground">Try asking</p>
              <button type="button" className="block w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-accent hover:text-foreground"
                onClick={() => setInstruction('Make the Cadence project bullets more concise')}>
                Make the Cadence project bullets more concise
              </button>
              <button type="button" className="block w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-accent hover:text-foreground"
                onClick={() => setInstruction('Move the Skills section above Education')}>
                Move the Skills section above Education
              </button>
            </div>
          ) : messages.map((message) => (
            <div
              key={message.id}
              className={message.role === 'user' ? 'flex justify-end' : 'flex gap-2'}
            >
              {message.role !== 'user' ? (
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
                  <Bot className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div className={message.role === 'user'
                ? 'max-w-[88%] rounded-xl rounded-br-sm bg-primary px-3 py-2 text-xs leading-relaxed text-primary-foreground'
                : `min-w-0 flex-1 text-xs leading-relaxed ${message.role === 'error' ? 'text-destructive' : 'text-foreground'}`}>
                <p>{message.text}</p>
                {message.changes?.length ? (
                  <div className="mt-3 space-y-2">
                    {message.changes.map((change, index) => (
                      <div key={index} className="overflow-hidden rounded-md border border-border font-mono text-[10px] leading-relaxed">
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words bg-destructive/10 px-2 py-1.5 text-destructive">
                          <span className="select-none opacity-60">− </span>{change.before}
                        </pre>
                        <pre className="max-h-28 overflow-auto whitespace-pre-wrap break-words border-t border-border bg-success/10 px-2 py-1.5 text-foreground">
                          <span className="select-none text-success">+ </span>{change.after}
                        </pre>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {pending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Editing and checking the PDF…
            </div>
          ) : null}
      </div>

      <div className="shrink-0 border-t border-border bg-background p-3">
        <div className="rounded-xl border-2 border-input bg-card p-2 shadow-sm transition-colors focus-within:border-success focus-within:ring-2 focus-within:ring-success/20">
          <Textarea
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                submit()
              }
            }}
            disabled={pending}
            maxLength={2_000}
            placeholder="What would you like to change?"
            className="min-h-20 resize-none border-0 bg-transparent p-1 text-xs shadow-none focus-visible:border-0 focus-visible:ring-0"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={onUndo}
              disabled={pending || !canUndo}>
              <Undo2 /> Undo
            </Button>
            <Button variant="success" size="icon" className="h-8 w-8" onClick={submit}
              disabled={pending || instruction.trim().length < 2}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </aside>
  )
}
