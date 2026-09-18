'use client'

import { useRef, useState } from 'react'
import { Info, KeyRound } from 'lucide-react'

import { ModelSettings, type AiSettings } from '@/components/settings/model-settings'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function hasEnabledAi(settings: AiSettings): boolean {
  return settings.enabled && Boolean(settings.keyHint)
}

export function ApiKeyDialog({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: AiSettings
  onSettingsChange: (settings: AiSettings) => void
}) {
  const [busy, setBusy] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent
        ref={contentRef}
        tabIndex={-1}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          contentRef.current?.focus()
        }}
        className="max-h-[90vh] max-w-2xl overflow-y-auto outline-none"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Add an API key to continue
            <span className="group relative inline-flex">
              <button
                type="button"
                aria-label="How your API key is protected"
                className="rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Info className="h-4 w-4" />
              </button>
              <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-full z-50 ml-2 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-md border border-border bg-popover px-3 py-2 text-left text-xs font-normal leading-relaxed text-popover-foreground opacity-0 shadow-md transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
              >
                Your key is encrypted before storage and never sent back to the browser. Verification
                makes a small request to confirm the key works.
              </span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          <ModelSettings
            settings={settings}
            showSecurityNotice={false}
            onBusyChange={setBusy}
            onSettingsChange={(next) => {
              onSettingsChange(next)
              if (hasEnabledAi(next)) onOpenChange(false)
            }}
          />
          <DialogDescription className="mt-6 border-t border-border pt-4">
            AI generation uses your own provider account. Requests use your provider’s quota and
            billing, and your log and resume text go to the provider you choose. Pick a provider and
            verify your key, or enable the key you already saved.
          </DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  )
}
