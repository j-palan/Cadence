'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileCode2, FolderOpen, Loader2, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { LOG_PATH } from '@/lib/agents'
import { readGenerateStream } from '@/lib/generate-stream'
import { DEFAULT_TEMPLATE, TEMPLATES } from '@/lib/templates/meta'

const MIN_LOG_CHARS = 20

type FilePickerWindow = Window & {
  showOpenFilePicker?: (options?: unknown) => Promise<Array<{ getFile: () => Promise<File> }>>
}

export function ImportForm() {
  const router = useRouter()
  const [log, setLog] = useState('')
  const [name, setName] = useState('My Resume')
  const [generating, setGenerating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [canPickFile, setCanPickFile] = useState(false)
  const previewRef = useRef<HTMLPreElement>(null)

  const template = TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE)

  // The File System Access API is Chromium-only; feature-detect after mount so
  // the button simply is not there in Firefox and Safari.
  useEffect(() => {
    setCanPickFile(typeof (window as FilePickerWindow).showOpenFilePicker === 'function')
  }, [])

  useEffect(() => {
    previewRef.current?.scrollTo({ top: previewRef.current.scrollHeight })
  }, [preview])

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
      setLog(await file.text())
      setError(null)
    } catch {
      // An aborted picker throws; nothing to report.
    }
  }

  async function generate() {
    if (log.trim().length < MIN_LOG_CHARS) {
      setError('Paste your log first — there is not enough here to work with.')
      return
    }

    setGenerating(true)
    setError(null)
    setPreview('')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'create',
          log,
          template: DEFAULT_TEMPLATE,
          name: name.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Generation failed (${response.status})`)
      }

      const result = await readGenerateStream(response, setPreview)

      if (result.error) throw new Error(result.error)
      if (!result.resumeId) throw new Error('The resume was generated but could not be saved.')

      router.push(`/resume/${result.resumeId}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Generation failed.')
      setGenerating(false)
    }
  }

  async function startFromTemplate() {
    setStarting(true)
    setError(null)

    try {
      const response = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          template: DEFAULT_TEMPLATE,
        }),
      })

      if (!response.ok) throw new Error('Could not create a resume.')

      const body = (await response.json()) as { id: string }
      router.push(`/resume/${body.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create a resume.')
      setStarting(false)
    }
  }

  const busy = generating || starting

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="resume-name" className="text-xs text-muted-foreground">
            Resume name
          </Label>
          <Input
            id="resume-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={busy}
            maxLength={120}
            className="max-w-xs"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-semibold">Bring in your log</h2>
            <p className="text-sm text-muted-foreground">
              Paste the contents of <code className="text-primary">{LOG_PATH}</code>, or open the
              file directly.
            </p>
          </div>
          {canPickFile ? (
            <Button variant="outline" size="sm" onClick={openFile} disabled={busy}>
              <FolderOpen />
              Open file
            </Button>
          ) : null}
        </div>

        <Textarea
          value={log}
          onChange={(event) => setLog(event.target.value)}
          disabled={busy}
          placeholder={'## cadence\n- Cut p99 latency 840ms → 190ms by batching loader queries…'}
          className="min-h-64 font-mono text-xs leading-relaxed"
        />
        <p className="text-xs text-muted-foreground">{log.length.toLocaleString()} characters</p>
      </section>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="success" onClick={generate} disabled={busy}>
          {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {generating ? 'Generating…' : 'Generate from log'}
        </Button>
        <Button variant="outline" onClick={startFromTemplate} disabled={busy}>
          {starting ? <Loader2 className="animate-spin" /> : <FileCode2 />}
          Skip — edit the template myself
        </Button>
      </div>

      {generating ? (
        <pre
          ref={previewRef}
          className="max-h-64 overflow-auto rounded-lg border border-border bg-card p-4 text-[11px] leading-relaxed text-muted-foreground"
        >
          <code>{preview || 'Waiting for the first tokens…'}</code>
        </pre>
      ) : null}

      {template ? (
        <>
          <Separator />
          <p className="text-xs text-muted-foreground">
            Both paths open the LaTeX editor on <strong>{template.name}</strong> —{' '}
            {template.description.toLowerCase()}
            {template.credit ? (
              <>
                {' '}
                Template by{' '}
                <a
                  href={template.credit.href}
                  target="_blank"
                  rel="noreferrer"
                  className="underline hover:text-foreground"
                >
                  {template.credit.label}
                </a>
                .
              </>
            ) : null}
          </p>
        </>
      ) : null}
    </div>
  )
}
