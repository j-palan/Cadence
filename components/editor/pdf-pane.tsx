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
    <div className="relative h-full bg-neutral-800">
      {url ? (
        // The object element renders the browser's own PDF viewer, which brings
        // scroll, zoom, and text selection for free.
        <object data={url} type="application/pdf" className="h-full w-full">
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <FileWarning className="h-6 w-6 text-neutral-400" />
            <p className="text-sm text-neutral-300">
              This browser will not display the PDF inline.
            </p>
            <Button asChild variant="secondary" size="sm">
              <a href={url} target="_blank" rel="noreferrer">
                Open PDF in a new tab
              </a>
            </Button>
          </div>
        </object>
      ) : null}

      {showStaleOverlay ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
          <span className="flex items-center gap-2 rounded-sm bg-neutral-900/90 px-3 py-1.5 text-xs text-neutral-200">
            <Loader2 className="h-3 w-3 animate-spin" />
            Recompiling…
          </span>
        </div>
      ) : null}

      {!url ? (
        <div className="flex h-full items-center justify-center p-8">
          {status === 'compiling' ? (
            <span className="flex items-center gap-2 text-sm text-neutral-300">
              <Loader2 className="h-4 w-4 animate-spin" />
              Compiling…
            </span>
          ) : status === 'failed' ? (
            <div className="w-full max-w-md space-y-3">
              <p className="flex items-center gap-2 text-sm font-medium text-red-300">
                <AlertTriangle className="h-4 w-4" />
                {errors.length > 0
                  ? `${errors.length} LaTeX error${errors.length === 1 ? '' : 's'}`
                  : 'Compilation failed'}
              </p>
              <ul className="space-y-1.5">
                {errors.slice(0, 6).map((error, index) => (
                  <li
                    key={`${error.line}-${index}`}
                    className="rounded-sm border border-red-900/60 bg-red-950/40 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-red-200"
                  >
                    {error.line ? (
                      <span className="mr-1.5 text-red-400">line {error.line}</span>
                    ) : null}
                    {error.message}
                  </li>
                ))}
              </ul>
              {log ? (
                <Button variant="secondary" size="sm" onClick={onShowLog}>
                  View full log
                </Button>
              ) : null}
            </div>
          ) : status === 'unavailable' ? (
            <div className="max-w-md space-y-2 text-center">
              <FileWarning className="mx-auto h-6 w-6 text-amber-400" />
              <p className="text-sm text-neutral-200">{message}</p>
              <p className="font-mono text-xs text-neutral-400">brew install tectonic</p>
            </div>
          ) : (
            <p className="text-sm text-neutral-400">
              {message ?? 'Compile to see your resume.'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
