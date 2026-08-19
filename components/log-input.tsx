'use client'

import { useEffect, useState } from 'react'
import { FolderOpen } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { LOG_PATH } from '@/lib/agents'
import { cn } from '@/lib/utils'

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<Array<{ getFile: () => Promise<File> }>>
}

/**
 * Textarea plus a native file picker for the agent log.
 *
 * The File System Access API is Chromium-only, so the button is feature-detected
 * after mount and simply absent in Firefox and Safari, where pasting is the path.
 */
export function LogInput({
  value,
  onChange,
  disabled,
  className,
  label = 'Your log',
  hint,
}: {
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  className?: string
  label?: string
  hint?: React.ReactNode
}) {
  const [canPickFile, setCanPickFile] = useState(false)

  useEffect(() => {
    setCanPickFile(typeof (window as FilePickerWindow).showOpenFilePicker === 'function')
  }, [])

  async function openFile() {
    const picker = (window as FilePickerWindow).showOpenFilePicker
    if (!picker) return

    try {
      const [handle] = await picker({
        types: [
          {
            description: 'Markdown log',
            accept: { 'text/markdown': ['.md'], 'text/plain': ['.txt'] },
          },
        ],
        multiple: false,
      })
      const file = await handle.getFile()
      onChange(await file.text())
    } catch {
      // An aborted picker throws; nothing to report.
    }
  }

  return (
    <div className={cn('space-y-2.5', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {hint ?? (
              <>
                Paste the contents of{' '}
                <code className="font-mono text-foreground">{LOG_PATH}</code>, or open the file
                directly.
              </>
            )}
          </p>
        </div>
        {canPickFile ? (
          <Button variant="outline" size="sm" onClick={openFile} disabled={disabled}>
            <FolderOpen />
            Open file
          </Button>
        ) : null}
      </div>

      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        placeholder={'## cadence\n- Cut p99 latency 840ms → 190ms by batching loader queries…'}
        className="min-h-56 font-mono text-xs leading-relaxed"
      />
      <p className="text-xs text-muted-foreground">{value.length.toLocaleString()} characters</p>
    </div>
  )
}
