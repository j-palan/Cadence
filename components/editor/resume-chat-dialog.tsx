'use client'

import { useState } from 'react'
import { Bot, Loader2, Send, Undo2, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

export interface ResumeChatMessage {
  id: number
  role: 'user' | 'assistant' | 'error'
  text: string
}

export function ResumeChatDialog({
  open,
  onOpenChange,
  messages,
  pending,
  canUndo,
  onSubmit,
  onUndo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  messages: ResumeChatMessage[]
  pending: boolean
  canUndo: boolean
  onSubmit: (instruction: string) => void
  onUndo: () => void
}) {
  const [instruction, setInstruction] = useState('')

  function submit() {
    const value = instruction.trim()
    if (!value || pending) return
    setInstruction('')
    onSubmit(value)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent className="left-4 right-4 top-4 flex max-h-[calc(100dvh-2rem)] w-auto translate-x-0 translate-y-0 flex-col sm:left-auto sm:right-6 sm:top-16 sm:w-full sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-success" />
            Edit with AI
          </DialogTitle>
          <DialogDescription>
            Describe a change. Cadence edits only the matching LaTeX and verifies that it compiles.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-5 min-h-32 flex-1 space-y-3 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
          {messages.length === 0 ? (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Try one of these:</p>
              <button type="button" className="block text-left hover:text-foreground"
                onClick={() => setInstruction('Make the Cadence project bullets more concise')}>
                “Make the Cadence project bullets more concise”
              </button>
              <button type="button" className="block text-left hover:text-foreground"
                onClick={() => setInstruction('Move the Skills section above Education')}>
                “Move the Skills section above Education”
              </button>
            </div>
          ) : messages.map((message) => (
            <div key={message.id} className={`flex gap-2 text-sm ${message.role === 'error' ? 'text-destructive' : ''}`}>
              {message.role === 'user'
                ? <User className="mt-0.5 h-4 w-4 shrink-0" />
                : <Bot className="mt-0.5 h-4 w-4 shrink-0" />}
              <p className="leading-relaxed">{message.text}</p>
            </div>
          ))}
          {pending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Finding the smallest safe edit and checking the PDF…
            </div>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
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
            className="min-h-24"
          />
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={onUndo} disabled={pending || !canUndo}>
              <Undo2 /> Undo last edit
            </Button>
            <Button variant="success" size="sm" onClick={submit}
              disabled={pending || instruction.trim().length < 2}>
              {pending ? <Loader2 className="animate-spin" /> : <Send />}
              Send
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
