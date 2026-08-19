'use client'

import { Sparkles } from 'lucide-react'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MAX_CUSTOM_INSTRUCTIONS_CHARS } from '@/lib/prompts'

/**
 * Free-text guidance for one generation run.
 *
 * Cadence holds the resume to one page with 4–5 bullets per job by default; this
 * is the escape hatch for anyone who wants something else. The copy says so,
 * because a box labelled only "instructions" gives no clue what is worth typing.
 */
export function InstructionsField({
  value,
  onChange,
  disabled,
  examples,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  examples: string
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor="custom-instructions"
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Sparkles className="h-3 w-3 text-success" />
        Instructions
        <span className="font-normal opacity-70">— optional</span>
      </Label>

      <Textarea
        id="custom-instructions"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={MAX_CUSTOM_INSTRUCTIONS_CHARS}
        placeholder={examples}
        className="min-h-20 text-xs leading-relaxed"
      />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Anything here wins over the defaults — one page, 4–5 bullets per job, 1–2 per project.
        {value.length > 0 ? (
          <span className="ml-1 font-mono opacity-70">
            {value.length}/{MAX_CUSTOM_INSTRUCTIONS_CHARS}
          </span>
        ) : null}
      </p>
    </div>
  )
}
