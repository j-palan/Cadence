'use client'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { resumeText } from '@/lib/jobs/matching'

export interface TailorReview {
  token: string; before: string; after: string; name: string
  changes: { before: string; after: string }[]
}
export function TailorReviewDialog({ review, pending, error, onAccept, onDiscard }: {
  review: TailorReview | null; pending: boolean; error: string | null; onAccept: () => void; onDiscard: () => void
}) {
  return <Dialog open={!!review} onOpenChange={open => { if (!open && !pending) onDiscard() }}>
    <DialogContent className="max-h-[85dvh] max-w-3xl overflow-y-auto" onEscapeKeyDown={event => { if (pending) event.preventDefault() }} onInteractOutside={event => { if (pending) event.preventDefault() }}>
      <DialogHeader><DialogTitle>Review tailoring changes</DialogTitle><DialogDescription>Nothing has been saved yet. Accept to create “{review?.name}”, or discard to keep everything as it is.</DialogDescription></DialogHeader>
      <div className="mt-5 space-y-4">
        {!review?.changes.length ? <p className="text-sm text-muted-foreground">Your resume already aligns with this posting. You can still save a named copy.</p> : null}
        {review?.changes.map((change, index) => <section key={index} className="overflow-hidden rounded-lg border border-border">
          <h3 className="border-b border-border px-4 py-2 text-xs font-medium">Change {index + 1}</h3>
          <div className="grid sm:grid-cols-2"><div className="border-b border-border bg-destructive/5 p-4 sm:border-b-0 sm:border-r"><p className="mb-2 text-xs font-medium text-destructive">Before</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{resumeText(change.before) || '(empty)'}</p></div><div className="bg-success/5 p-4"><p className="mb-2 text-xs font-medium text-success">After</p><p className="whitespace-pre-wrap text-sm leading-relaxed">{resumeText(change.after) || '(removed)'}</p></div></div>
          <details className="px-4 py-2"><summary className="cursor-pointer text-xs text-muted-foreground">View source changes</summary><pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs"><del className="text-destructive">{change.before}</del>{'\n'}<ins className="text-success">{change.after}</ins></pre></details>
        </section>)}
      </div>
      {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
      <DialogFooter><Button variant="ghost" disabled={pending} onClick={onDiscard}>Discard changes</Button><Button variant="success" disabled={pending} onClick={onAccept}>{pending ? 'Saving…' : 'Accept & create copy'}</Button></DialogFooter>
    </DialogContent>
  </Dialog>
}
