'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Group, Panel, Separator } from 'react-resizable-panels'
import {
  ArrowLeft,
  Check,
  CloudOff,
  Download,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  ScrollText,
} from 'lucide-react'

import { EditorBoundary } from '@/components/editor/editor-boundary'
import { PdfPane } from '@/components/editor/pdf-pane'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { readGenerateStream } from '@/lib/generate-stream'
import type { CompileFailureBody, LatexError } from '@/lib/latex-client'
import { templateName } from '@/lib/templates/meta'

// CodeMirror touches `document` on import, so it must not be server-rendered.
const CodePane = dynamic(
  () => import('@/components/editor/code-pane').then((m) => m.CodePane),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#282c34]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    ),
  },
)

const AUTOSAVE_DELAY_MS = 1500
const COMPILE_DELAY_MS = 2000

type SaveState = 'saved' | 'dirty' | 'saving' | 'error'
type CompileState = 'idle' | 'compiling' | 'ok' | 'failed' | 'unavailable'

export interface ResumeEditorProps {
  resume: {
    id: string
    name: string
    template: string
    latexSource: string
    updatedAt: string
  }
  /** The stored log, when there is one — enables "Regenerate from log". */
  hasLog: boolean
}

export function ResumeEditor({ resume, hasLog }: ResumeEditorProps) {
  const [source, setSource] = useState(resume.latexSource)
  const [name, setName] = useState(resume.name)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [compileState, setCompileState] = useState<CompileState>('idle')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [errors, setErrors] = useState<LatexError[]>([])
  const [log, setLog] = useState('')
  const [notice, setNotice] = useState<string | null>('Compiling for the first time…')
  const [logOpen, setLogOpen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [engine, setEngine] = useState<string | null>(null)

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const compileTimer = useRef<ReturnType<typeof setTimeout>>()
  // Guards against an earlier, slower compile overwriting a newer result.
  const compileSeq = useRef(0)
  const pdfUrlRef = useRef<string | null>(null)
  const sourceRef = useRef(source)

  sourceRef.current = source

  const replacePdfUrl = useCallback((next: string | null) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
    pdfUrlRef.current = next
    setPdfUrl(next)
  }, [])

  // Release the last blob URL when the editor unmounts.
  useEffect(
    () => () => {
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current)
    },
    [],
  )

  const compile = useCallback(async () => {
    const seq = ++compileSeq.current
    setCompileState('compiling')
    setNotice(null)

    try {
      const response = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeId: resume.id, source: sourceRef.current }),
      })

      if (seq !== compileSeq.current) return

      if (response.ok) {
        const blob = await response.blob()
        if (seq !== compileSeq.current) return

        replacePdfUrl(URL.createObjectURL(blob))
        setErrors([])
        setLog('')
        setEngine(response.headers.get('X-Cadence-Engine'))
        setCompileState('ok')
        return
      }

      const body = (await response.json().catch(() => null)) as CompileFailureBody | null

      if (seq !== compileSeq.current) return

      setErrors(body?.errors ?? [])
      setLog(body?.log ?? '')
      setNotice(body?.error ?? `Compilation failed (${response.status})`)
      // A missing engine is a setup problem, not a document problem — the pane
      // says so instead of blaming the LaTeX.
      setCompileState(body?.engineMissing ? 'unavailable' : 'failed')

      // Keep the last good PDF on screen when only the newest edit is broken;
      // clear it when there was never one.
      if (body?.engineMissing) replacePdfUrl(null)
    } catch (error) {
      if (seq !== compileSeq.current) return
      setNotice(error instanceof Error ? error.message : 'Compilation failed.')
      setCompileState('failed')
    }
  }, [replacePdfUrl, resume.id])

  const save = useCallback(
    async (nextSource: string) => {
      setSaveState('saving')
      try {
        const response = await fetch(`/api/resumes/${resume.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latexSource: nextSource }),
        })
        setSaveState(response.ok ? 'saved' : 'error')
      } catch {
        setSaveState('error')
      }
    },
    [resume.id],
  )

  // First paint: compile whatever is stored so the preview is never blank.
  useEffect(() => {
    void compile()
  }, [compile])

  // Overleaf's rhythm: save shortly after typing stops, recompile shortly after
  // that. Both timers reset on every keystroke.
  const scheduleWork = useCallback(
    (nextSource: string) => {
      clearTimeout(saveTimer.current)
      clearTimeout(compileTimer.current)

      saveTimer.current = setTimeout(() => void save(nextSource), AUTOSAVE_DELAY_MS)
      compileTimer.current = setTimeout(() => void compile(), COMPILE_DELAY_MS)
    },
    [compile, save],
  )

  useEffect(
    () => () => {
      clearTimeout(saveTimer.current)
      clearTimeout(compileTimer.current)
    },
    [],
  )

  function onSourceChange(next: string) {
    setSource(next)
    setSaveState('dirty')
    scheduleWork(next)
  }

  /** Cmd/Ctrl+S and the Recompile button: flush both timers immediately. */
  const saveAndCompileNow = useCallback(() => {
    clearTimeout(saveTimer.current)
    clearTimeout(compileTimer.current)
    void save(sourceRef.current)
    void compile()
  }, [compile, save])

  async function renameResume(nextName: string) {
    setName(nextName)
    await fetch(`/api/resumes/${resume.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: nextName.trim() || 'My Resume' }),
    }).catch(() => setSaveState('error'))
  }

  async function download() {
    const response = await fetch('/api/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeId: resume.id, source, mode: 'download' }),
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as CompileFailureBody | null
      setNotice(body?.error ?? 'Could not produce a PDF.')
      setErrors(body?.errors ?? [])
      setLog(body?.log ?? '')
      setCompileState(body?.engineMissing ? 'unavailable' : 'failed')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${name.trim() || 'resume'}.pdf`
    document.body.append(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  async function regenerate() {
    setRegenerating(true)
    setNotice(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The stored log is looked up server-side from resumeId; sending it from
        // the client would let anyone regenerate against arbitrary content.
        body: JSON.stringify({ resumeId: resume.id, template: resume.template }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Regeneration failed (${response.status})`)
      }

      const result = await readGenerateStream(response, setSource)
      if (result.error) throw new Error(result.error)

      setSource(result.source)
      setSaveState('saved')
      sourceRef.current = result.source
      await compile()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Regeneration failed.')
    } finally {
      setRegenerating(false)
    }
  }

  const busy = compileState === 'compiling' || regenerating

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft />
          </Link>
        </Button>

        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={(event) => void renameResume(event.target.value)}
          maxLength={120}
          aria-label="Resume name"
          className="h-8 w-48 border-transparent bg-transparent px-2 font-medium hover:border-border focus-visible:border-border"
        />

        <Badge variant="outline" className="hidden sm:inline-flex">
          <FileText className="h-3 w-3" />
          {templateName(resume.template)}
        </Badge>

        <SaveIndicator state={saveState} />

        <div className="ml-auto flex items-center gap-2">
          {hasLog ? (
            <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}>
              {regenerating ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              <span className="hidden sm:inline">Regenerate from log</span>
            </Button>
          ) : null}

          {log ? (
            <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)}>
              <ScrollText />
              <span className="hidden sm:inline">Log</span>
            </Button>
          ) : null}

          <Button variant="outline" size="sm" onClick={saveAndCompileNow} disabled={busy}>
            {compileState === 'compiling' ? <Loader2 className="animate-spin" /> : <Play />}
            Recompile
          </Button>

          <Button size="sm" onClick={download} disabled={busy}>
            <Download />
            <span className="hidden sm:inline">PDF</span>
          </Button>
        </div>
      </div>

      <Group orientation="horizontal" className="flex-1 overflow-hidden">
        <Panel defaultSize="50%" minSize="25%" className="overflow-hidden">
          <EditorBoundary value={source} onChange={onSourceChange}>
            <CodePane value={source} onChange={onSourceChange} onSave={saveAndCompileNow} />
          </EditorBoundary>
        </Panel>

        <Separator className="w-1.5 cursor-col-resize bg-border transition-colors hover:bg-primary/60 data-[state=dragging]:bg-primary" />

        <Panel defaultSize="50%" minSize="25%" className="overflow-hidden">
          <PdfPane
            url={pdfUrl}
            status={compileState}
            errors={errors}
            log={log}
            message={notice}
            onShowLog={() => setLogOpen(true)}
          />
        </Panel>
      </Group>

      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {source.split('\n').length.toLocaleString()} lines ·{' '}
          {source.length.toLocaleString()} chars
        </span>
        <span className="hidden sm:inline">
          <kbd className="rounded-sm border border-border px-1">⌘S</kbd> saves and recompiles
        </span>
        <span className="font-mono">
          {compileState === 'ok' && engine ? `compiled with ${engine}` : null}
          {compileState === 'failed' && errors.length > 0
            ? `${errors.length} error${errors.length === 1 ? '' : 's'}`
            : null}
        </span>
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compiler log</DialogTitle>
            <DialogDescription>
              Raw output from the TeX engine, newest run.
            </DialogDescription>
          </DialogHeader>
          <pre className="mt-4 max-h-[60vh] overflow-auto rounded-md border border-border bg-background p-3 text-[11px] leading-relaxed">
            <code>{log || 'No log output.'}</code>
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        Saving
      </span>
    )
  }

  if (state === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-destructive">
        <CloudOff className="h-3 w-3" />
        Not saved
      </span>
    )
  }

  if (state === 'dirty') {
    return <span className="text-xs text-muted-foreground">Unsaved changes</span>
  }

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="h-3 w-3 text-success" />
      Saved
    </span>
  )
}
