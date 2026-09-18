'use client'

import { useState } from 'react'
import { Loader2, Target } from 'lucide-react'

import { InstructionsField } from '@/components/editor/instructions-field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MODE_LABELS } from '@/lib/prompts'

const MIN_CHARS = 50

/**
 * Collects a job description for the `tailor` pass.
 *
 * The copy states the guarantee up front — nothing gets added that is not
 * already on the resume — because that is the property a user needs to trust
 * before pasting a real posting in.
 */
export function TailorDialog({
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (jobDescription: string, customInstructions: string) => void
  pending: boolean
  error: string | null
}) {
  const [text, setText] = useState('')
  const [instructions, setInstructions] = useState('')
  const tooShort = text.trim().length < MIN_CHARS

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-4 w-4 text-success" />
            {MODE_LABELS.tailor.title}
          </DialogTitle>
          <DialogDescription>{MODE_LABELS.tailor.description}</DialogDescription>
        </DialogHeader>

        <div className="mt-5 space-y-1.5">
          <Label htmlFor="job-description" className="text-xs text-muted-foreground">
            Job description
          </Label>
          <Textarea
            id="job-description"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={pending}
            placeholder="Paste the posting — responsibilities and requirements are the parts that matter."
            className="min-h-56 text-xs leading-relaxed"
          />
          <p className="text-xs text-muted-foreground">
            {text.trim().length.toLocaleString()} characters
            {tooShort && text.length > 0 ? ` · need at least ${MIN_CHARS}` : ''}
          </p>
        </div>

        <div className="mt-5">
          <InstructionsField
            value={instructions}
            onChange={setInstructions}
            disabled={pending}
            examples={'e.g. "emphasise the backend work", "use their exact phrasing for the platform team", "do not touch the projects section"'}
          />
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => onSubmit(text, instructions)}
            disabled={pending || tooShort}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Target />}
            Tailor resume
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
