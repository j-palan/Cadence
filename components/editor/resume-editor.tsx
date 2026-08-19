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
  ScrollText,
  Sparkles,
  Target,
} from 'lucide-react'

import { EditorBoundary } from '@/components/editor/editor-boundary'
import { PdfPane } from '@/components/editor/pdf-pane'
import { TailorDialog } from '@/components/editor/tailor-dialog'
import { UpdateDialog } from '@/components/editor/update-dialog'
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
import type { GenerationMode } from '@/lib/prompts'
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
  /** When the log was last imported, if ever. Shown in the update dialog. */
  lastLogImportedAt: string | null
}

export function ResumeEditor({ resume, lastLogImportedAt }: ResumeEditorProps) {
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
  const [tailorOpen, setTailorOpen] = useState(false)
  const [tailorError, setTailorError] = useState<string | null>(null)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [engine, setEngine] = useState<string | null>(null)
  // True when the source has changed since the last successful compile, so the
  // preview on screen is out of date.
  const [stale, setStale] = useState(false)

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
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
        setStale(false)
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

  /**
   * Saving is automatic; compiling is not.
   *
   * Every compile spawns a TeX process, so it runs only when the user asks —
   * the Recompile button or Cmd/Ctrl+S. Typing just marks the preview stale.
   */
  const scheduleSave = useCallback(
    (nextSource: string) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => void save(nextSource), AUTOSAVE_DELAY_MS)
    },
    [save],
  )

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  function onSourceChange(next: string) {
    setSource(next)
    setSaveState('dirty')
    setStale(true)
    scheduleSave(next)
  }

  /** Cmd/Ctrl+S and the Recompile button: save now, then compile. */
  const saveAndCompileNow = useCallback(() => {
    clearTimeout(saveTimer.current)
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

  /**
   * Runs an AI pass over the document — `update` against a freshly pasted log,
   * or `tailor` toward a job description.
   *
   * Ownership of the resume is still checked server-side from resumeId; the
   * client only supplies the new material.
   */
  async function runGeneration(
    mode: Exclude<GenerationMode, 'create'>,
    payload: { log?: string; jobDescription?: string; customInstructions?: string } = {},
  ) {
    setRegenerating(true)
    setNotice(null)
    setTailorError(null)
    setUpdateError(null)

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          resumeId: resume.id,
          template: resume.template,
          ...payload,
        }),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? `Generation failed (${response.status})`)
      }

      const result = await readGenerateStream(response, setSource)
      if (result.error) throw new Error(result.error)

      setSource(result.source)
      sourceRef.current = result.source
      setSaveState('saved')
      setTailorOpen(false)
      setUpdateOpen(false)
      await compile()
      setStale(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.'
      // Keep the dialog open on failure so what was pasted is not lost.
      if (mode === 'tailor') setTailorError(message)
      else if (mode === 'update') setUpdateError(message)
      else setNotice(message)
    } finally {
      setRegenerating(false)
    }
  }

  const busy = compileState === 'compiling' || regenerating

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-4 py-2.5">
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
          className="h-9 w-48 border-transparent bg-transparent px-2 font-semibold hover:border-border focus-visible:border-border"
        />

        <Badge variant="muted" className="hidden sm:inline-flex">
          <FileText className="h-3 w-3" />
          {templateName(resume.template)}
        </Badge>

        <SaveIndicator state={saveState} />

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUpdateOpen(true)}
            disabled={busy}
            title="Merge anything new in your log into this resume"
          >
            {regenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            <span className="hidden md:inline">Update</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTailorOpen(true)}
            disabled={busy}
            title="Align wording with a job description"
          >
            <Target />
            <span className="hidden md:inline">Tailor</span>
          </Button>

          {log ? (
            <Button variant="ghost" size="sm" onClick={() => setLogOpen(true)}>
              <ScrollText />
              <span className="hidden sm:inline">Log</span>
            </Button>
          ) : null}

          <Button
            variant={stale ? 'success' : 'outline'}
            size="sm"
            onClick={saveAndCompileNow}
            disabled={busy}
            title={stale ? 'The preview is out of date (⌘S)' : 'Recompile (⌘S)'}
          >
            {compileState === 'compiling' ? <Loader2 className="animate-spin" /> : <Play />}
            Recompile
          </Button>

          <Button variant="secondary" size="sm" onClick={download} disabled={busy}>
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

        <Separator className="w-1 cursor-col-resize bg-border transition-colors hover:bg-success data-[state=dragging]:bg-success" />

        <Panel defaultSize="50%" minSize="25%" className="overflow-hidden">
          <PdfPane
            url={pdfUrl}
            stale={stale}
            status={compileState}
            errors={errors}
            log={log}
            message={notice}
            onShowLog={() => setLogOpen(true)}
          />
        </Panel>
      </Group>

      <div className="flex items-center justify-between gap-3 border-t border-border bg-background px-4 py-2 text-[11px] text-muted-foreground">
        <span className="font-mono">
          {source.split('\n').length.toLocaleString()} lines ·{' '}
          {source.length.toLocaleString()} chars
        </span>
        <span className="hidden sm:inline">
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono">⌘S</kbd>{' '}
          recompiles
        </span>
        <span className="font-mono">
          {compileState === 'ok' && engine ? `compiled with ${engine}` : null}
          {compileState === 'failed' && errors.length > 0
            ? `${errors.length} error${errors.length === 1 ? '' : 's'}`
            : null}
        </span>
      </div>

      <UpdateDialog
        open={updateOpen}
        onOpenChange={(next) => {
          setUpdateOpen(next)
          if (!next) setUpdateError(null)
        }}
        onSubmit={(log, customInstructions) =>
          void runGeneration('update', { log, customInstructions: customInstructions || undefined })
        }
        pending={regenerating}
        error={updateError}
        lastImportedAt={lastLogImportedAt}
      />

      <TailorDialog
        open={tailorOpen}
        onOpenChange={(next) => {
          setTailorOpen(next)
          if (!next) setTailorError(null)
        }}
        onSubmit={(jobDescription, customInstructions) =>
          void runGeneration('tailor', {
            jobDescription,
            customInstructions: customInstructions || undefined,
          })
        }
        pending={regenerating}
        error={tailorError}
      />

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
      <Check className="h-3 w-3 text-success" strokeWidth={3} />
      Saved
    </span>
  )
}
