'use client'

import { AlertTriangle, FileWarning, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { LatexError } from '@/lib/latex-client'

export function PdfPane({
  url,
  status,
  errors,
  log,
  message,
  onShowLog,
}: {
  url: string | null
  status: 'idle' | 'compiling' | 'ok' | 'failed' | 'unavailable'
  errors: LatexError[]
  log: string
  message: string | null
  onShowLog: () => void
}) {
  const showStaleOverlay = status === 'compiling' && Boolean(url)

  return (
    <div className="relative h-full bg-muted">
      {url ? (
        // The object element gives us the browser's own PDF viewer, which brings
        // scroll, zoom, and text selection for free.
        <object data={url} type="application/pdf" className="h-full w-full">
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FileWarning className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This browser will not display the PDF inline.
            </p>
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                Open in a new tab
              </a>
            </Button>
          </div>
        </object>
      ) : null}

      {showStaleOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-4">
          <span className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            Recompiling
          </span>
        </div>
      ) : null}

      {!url ? (
        <div className="flex h-full items-center justify-center p-8">
          {status === 'compiling' ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Compiling…
            </span>
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
  )
}
