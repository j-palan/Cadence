import { Loader2 } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'

/**
 * Mirrors the editor's chrome — toolbar, split panes, status bar — so opening a
 * resume shows the shape of the page immediately instead of a blank screen.
 */
export default function EditorLoading() {
  return (
    <div className="flex h-[calc(100dvh-4rem-1px)] flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="hidden h-5 w-28 rounded-full sm:block" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden md:grid-cols-2">
        <div className="space-y-2.5 border-r border-border p-4">
          {/* Ragged widths read as code rather than prose. */}
          {[
            '70%', '45%', '85%', '30%', '60%', '78%', '52%', '90%',
            '38%', '66%', '80%', '48%', '72%', '58%',
          ].map((w, i) => (
            <Skeleton key={i} className="h-3" style={{ width: w }} />
          ))}
        </div>

        <div className="hidden items-center justify-center bg-muted md:flex">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Compiling your resume…</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border bg-background px-4 py-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}
