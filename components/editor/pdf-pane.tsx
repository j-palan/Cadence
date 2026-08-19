'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, FileWarning, Loader2, Minus, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { LatexError } from '@/lib/latex-client'
import { cn } from '@/lib/utils'

// Type-only import: erased at build time, so pdf.js itself stays dynamically
// imported and out of the initial bundle. Using the library's real types rather
// than hand-written shims is what keeps API drift a compile error.
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

/**
 * Renders the PDF page-by-page onto canvases with pdf.js.
 *
 * An <object>/<iframe> would hand the job to the browser's built-in viewer,
 * which brings its own toolbar, sidebar and dark chrome that cannot be themed.
 * Drawing the pages ourselves means the pane is just paper on a backdrop, the
 * way Overleaf does it.
 */
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.25, 1.5, 2]
/** Fallback only. The real page width is read from the document on load. */
const FALLBACK_PAGE_WIDTH = 612

export function PdfPane({
  url,
  stale = false,
  status,
  errors,
  log,
  message,
  onShowLog,
}: {
  url: string | null
  /** The source has changed since this PDF was produced. */
  stale?: boolean
  status: 'idle' | 'compiling' | 'ok' | 'failed' | 'unavailable'
  errors: LatexError[]
  log: string
  message: string | null
  onShowLog: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<PDFDocumentProxy | null>(null)
  // In-flight render tasks, cancelled when a newer render supersedes them.
  const tasksRef = useRef<RenderTask[]>([])
  // Preserved across recompiles so a rebuild does not throw you back to page 1.
  const scrollRatioRef = useRef(0)
  // The document's own page width in CSS px at scale 1. Read from the PDF rather
  // than assumed — the bundled template is US Letter, not A4, and fitting
  // against the wrong constant renders the page too small.
  const naturalWidthRef = useRef(FALLBACK_PAGE_WIDTH)

  const [zoom, setZoom] = useState<number | 'fit'>('fit')
  const [pageCount, setPageCount] = useState(0)
  const [rendering, setRendering] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)

  const effectiveScale = useCallback(
    (containerWidth: number) => {
      if (zoom !== 'fit') return zoom
      // 48px of breathing room either side, matching the pane padding.
      return Math.max(0.25, (containerWidth - 48) / naturalWidthRef.current)
    },
    [zoom],
  )

  const render = useCallback(async () => {
    const host = pagesRef.current
    const scroller = scrollRef.current
    const doc = docRef.current
    if (!host || !scroller || !doc) return

    // Abandon any render still in flight; its canvases are about to be replaced.
    for (const task of tasksRef.current) task.cancel()
    tasksRef.current = []

    setRendering(true)
    const scale = effectiveScale(scroller.clientWidth)
    // Render at device resolution so text is not soft on HiDPI screens.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const fragment = document.createDocumentFragment()

    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n)
      const viewport = page.getViewport({ scale: scale * dpr })

      const canvas = document.createElement('canvas')
      canvas.width = Math.floor(viewport.width)
      canvas.height = Math.floor(viewport.height)
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`
      canvas.className = 'block bg-white shadow-md'

      // `canvas` is required in pdf.js v6 — passing only `canvasContext` leaves
      // the render task pending forever and nothing ever paints.
      const task = page.render({ canvas, viewport })
      tasksRef.current.push(task)

      try {
        await task.promise
      } catch (error) {
        // A cancelled task is the expected outcome when the user zooms or a
        // recompile lands mid-render; anything else is worth surfacing.
        if ((error as { name?: string })?.name !== 'RenderingCancelledException') throw error
        return
      }

      fragment.append(canvas)
    }

    host.replaceChildren(fragment)
    setRendering(false)

    // Restore the reading position after the new canvases have laid out.
    requestAnimationFrame(() => {
      if (!scroller) return
      scroller.scrollTop = scrollRatioRef.current * scroller.scrollHeight
    })
  }, [effectiveScale])

  // Load the document whenever a fresh compile lands.
  useEffect(() => {
    if (!url) {
      docRef.current?.loadingTask.destroy().catch(() => {})
      docRef.current = null
      pagesRef.current?.replaceChildren()
      setPageCount(0)
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        setRenderError(null)
        // Dynamic import keeps ~1MB of pdf.js out of the initial bundle.
        const pdfjs = await import('pdfjs-dist')
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const doc = await pdfjs.getDocument({ url }).promise
        if (cancelled) {
          await doc.loadingTask.destroy().catch(() => {})
          return
        }

        const firstPage = await doc.getPage(1)
        naturalWidthRef.current = firstPage.getViewport({ scale: 1 }).width || FALLBACK_PAGE_WIDTH

        await docRef.current?.loadingTask.destroy().catch(() => {})
        docRef.current = doc
        setPageCount(doc.numPages)
        await render()
      } catch (error) {
        if (!cancelled) {
          console.error('[pdf-pane]', error)
          setRenderError('Could not display this PDF.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // `render` is intentionally omitted: zoom changes are handled below, and
    // including it would reload the document on every zoom step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // Re-render on zoom change without refetching.
  useEffect(() => {
    if (docRef.current) void render()
  }, [zoom, render])

  // Re-render on pane resize, but only while fitting to width.
  useEffect(() => {
    const scroller = scrollRef.current
    if (!scroller || zoom !== 'fit') return

    let timer: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (docRef.current) void render()
      }, 150)
    })

    observer.observe(scroller)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [zoom, render])

  useEffect(() => {
    return () => {
      for (const task of tasksRef.current) task.cancel()
      docRef.current?.loadingTask.destroy().catch(() => {})
    }
  }, [])

  function trackScroll() {
    const scroller = scrollRef.current
    if (!scroller || scroller.scrollHeight === 0) return
    scrollRatioRef.current = scroller.scrollTop / scroller.scrollHeight
  }

  function step(direction: 1 | -1) {
    const scroller = scrollRef.current
    const current =
      zoom === 'fit' ? effectiveScale(scroller?.clientWidth ?? naturalWidthRef.current) : zoom
    const next =
      direction === 1
        ? ZOOM_STEPS.find((value) => value > current + 0.01)
        : [...ZOOM_STEPS].reverse().find((value) => value < current - 0.01)
    if (next) setZoom(next)
  }

  const zoomLabel =
    zoom === 'fit'
      ? 'Fit'
      : `${Math.round(zoom * 100)}%`

  const showViewer = Boolean(url) && !renderError

  return (
    <div className="flex h-full flex-col bg-neutral-200/70 dark:bg-neutral-950">
      {/* A slim strip, not a browser toolbar. */}
      {showViewer ? (
        <div className="flex items-center gap-1 border-b border-border bg-background px-3 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Zoom out"
            onClick={() => step(-1)}
          >
            <Minus />
          </Button>
          <button
            type="button"
            onClick={() => setZoom('fit')}
            className="min-w-12 cursor-pointer rounded-md px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            title="Fit to width"
          >
            {zoomLabel}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="Zoom in"
            onClick={() => step(1)}
          >
            <Plus />
          </Button>

          <span className="ml-auto flex items-center gap-3">
            {stale ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                Out of date — press ⌘S
              </span>
            ) : null}
            <span className="font-mono text-[11px] text-muted-foreground">
              {pageCount > 0 ? `${pageCount} page${pageCount === 1 ? '' : 's'}` : null}
            </span>
          </span>

          {rendering || status === 'compiling' ? (
            <Loader2 className="ml-2 h-3 w-3 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onScroll={trackScroll}
        className={cn('relative flex-1 overflow-auto', showViewer ? 'p-6' : '')}
      >
        {showViewer ? (
          <div
            ref={pagesRef}
            className={cn(
              'mx-auto flex w-fit flex-col items-center gap-6 transition-opacity',
              stale && 'opacity-60',
            )}
          />
        ) : null}

        {!showViewer ? (
          <div className="flex h-full items-center justify-center p-8">
            {status === 'compiling' ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Compiling…
              </span>
            ) : renderError ? (
              <p className="text-sm text-muted-foreground">{renderError}</p>
            ) : status === 'failed' ? (
              <div className="w-full max-w-md space-y-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  {errors.length > 0
                    ? `${errors.length} LaTeX error${errors.length === 1 ? '' : 's'}`
                    : 'Compilation failed'}
                </p>
                <ul className="space-y-1.5">
                  {errors.slice(0, 6).map((error, index) => (
                    <li
                      key={`${error.line}-${index}`}
                      className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 font-mono text-[11px] leading-relaxed text-destructive"
                    >
                      {error.line ? (
                        <span className="mr-1.5 opacity-70">line {error.line}</span>
                      ) : null}
                      {error.message}
                    </li>
                  ))}
                </ul>
                {log ? (
                  <Button variant="outline" size="sm" onClick={onShowLog}>
                    View full log
                  </Button>
                ) : null}
              </div>
            ) : status === 'unavailable' ? (
              <div className="max-w-sm space-y-3 text-center">
                <FileWarning className="mx-auto h-5 w-5 text-muted-foreground" />
                <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
                <code className="inline-block rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs">
                  brew install tectonic
                </code>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {message ?? 'Compile to see your resume.'}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
