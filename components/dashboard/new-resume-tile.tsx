import Link from 'next/link'
import { Plus } from 'lucide-react'

/**
 * A create tile as the last item in the grid.
 *
 * It completes the row visually and puts the action where the eye already is,
 * which is why the dashboard no longer needs a separate top-right button.
 */
export function NewResumeTile() {
  return (
    <Link
      href="/resume/new"
      className="group flex min-h-[168px] flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border bg-transparent p-5 transition-colors hover:border-success/50 hover:bg-success/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors group-hover:border-success/40 group-hover:text-success">
        <Plus className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">New resume</span>
      <span className="text-xs text-muted-foreground">From your log, or the template</span>
    </Link>
  )
}
