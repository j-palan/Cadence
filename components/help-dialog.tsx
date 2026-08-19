'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LOG_PATH } from '@/lib/agents'

const STEPS = [
  {
    title: 'Let your agent do the writing',
    body: `Onboarding gave you a snippet for each coding agent you use. Once it is in their config, they append every win to ${LOG_PATH} as it happens — with the numbers still in front of them. That is the whole trick: you are not trying to remember six months later.`,
  },
  {
    title: 'Paste the whole log, every time',
    body: 'Create and Update both want the entire file, not just the new part. Cadence works out what is already covered. Pasting only the tail loses context and produces worse bullets.',
  },
  {
    title: 'Update as you go, Tailor per application',
    body: 'Update merges new log entries and leaves your own edits alone — run it every few weeks. Tailor takes a job description and only adjusts wording; it will never add a skill you do not already have listed. Tailor a copy, keep the original clean.',
  },
  {
    title: 'The editor is real LaTeX',
    body: 'Edit anything by hand. Nothing recompiles on its own — press Recompile or ⌘S when you want a new PDF, and the preview dims while it is out of date. Compiler errors arrive with line numbers.',
  },
]

const TIPS = [
  'Every resume is held to one page: 4–5 bullets a job, 1–2 a project, each bullet one line.',
  'Want something different? The Instructions box on Update and Tailor overrides those defaults.',
  'It will never invent an employer, a number, or a technology that is not in your log.',
]

export function HelpDialog() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="How to use Cadence"
        title="How to use Cadence"
        className="text-muted-foreground hover:text-foreground"
        onClick={() => setOpen(true)}
      >
        <HelpCircle />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>How to use Cadence</DialogTitle>
            <DialogDescription>
              Your agent keeps the record. Cadence turns it into a resume you can hand to someone.
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-6 space-y-5">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/12 font-mono text-[11px] text-success">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-7 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Worth knowing
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="text-success" aria-hidden="true">
                    ·
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
