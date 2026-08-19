'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileCode2, Loader2, Sparkles } from 'lucide-react'

import { LogInput } from '@/components/log-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { readGenerateStream } from '@/lib/generate-stream'
import { DEFAULT_TEMPLATE, TEMPLATES } from '@/lib/templates/meta'

const MIN_LOG_CHARS = 20

export function ImportForm() {
  const router = useRouter()
  const [log, setLog] = useState('')
  const [name, setName] = useState('My Resume')
  const [generating, setGenerating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState<string | null>(null)
  const previewRef = useRef<HTMLPreElement>(null)

  const template = TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE)

  useEffect(() => {
    previewRef.current?.scrollTo({ top: previewRef.current.scrollHeight })
  }, [preview])

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

      <LogInput value={log} onChange={setLog} disabled={busy} label="Bring in your log" />

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
