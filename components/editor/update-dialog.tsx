'use client'

import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'

import { InstructionsField } from '@/components/editor/instructions-field'
import { LogInput } from '@/components/log-input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LOG_PATH } from '@/lib/agents'
import { MODE_LABELS } from '@/lib/prompts'
import { formatRelativeTime } from '@/lib/utils'

const MIN_CHARS = 20

/**
 * Collects the *current* log for an update pass.
 *
 * It deliberately does not reuse the log stored from last time: that content has
 * already been merged into the resume, and the point of an update is to pick up
 * what the agent has appended since. The last-imported timestamp is shown so it
 * is clear how much ground the update is likely to cover.
 */
export function UpdateDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
  lastImportedAt,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (log: string, customInstructions: string) => void
  pending: boolean
  error: string | null
  lastImportedAt: string | null
}) {
  const [log, setLog] = useState('')
  const [instructions, setInstructions] = useState('')
  const tooShort = log.trim().length < MIN_CHARS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-success" />
            {MODE_LABELS.update.title}
          </DialogTitle>
          <DialogDescription>{MODE_LABELS.update.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-5">
          <LogInput
            value={log}
            onChange={setLog}
            disabled={pending}
            label="Your latest log"
            hint={
              <>
                <span className="block">
                  Paste <code className="font-mono text-foreground">{LOG_PATH}</code> as it stands
                  now — everything, not just the new part.
                </span>
                {lastImportedAt ? (
                  <span className="mt-1 block">
                    You last imported it{' '}
                    <strong className="font-semibold text-foreground">
                      {formatRelativeTime(lastImportedAt)}
                    </strong>
                    .
                  </span>
                ) : null}
              </>
            }
          />
        </div>

        <div className="mt-5">
          <InstructionsField
            value={instructions}
            onChange={setInstructions}
            disabled={pending}
            examples={'e.g. "keep it to 3 bullets per job", "let it run to two pages", "lead with the Cadence work", "drop the older internships"'}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => onSubmit(log, instructions)}
            disabled={pending || tooShort}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Update resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
