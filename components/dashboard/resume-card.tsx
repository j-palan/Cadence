'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, MoreHorizontal, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatRelativeTime } from '@/lib/utils'

export interface ResumeCardData {
  id: string
  name: string
  template: string
  updatedAt: string
}

export function ResumeCard({ resume }: { resume: ResumeCardData }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function remove() {
    setError(null)
    const response = await fetch(`/api/resumes/${resume.id}`, { method: 'DELETE' })

    if (!response.ok) {
      setError('Could not delete this resume.')
      return
    }

    setConfirming(false)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="group relative rounded-xl border border-border bg-card transition-colors hover:border-foreground/20">
        <Link href={`/resume/${resume.id}`} className="block p-5">
          {/* A miniature of the document itself — more use than an icon. */}
          <div className="mb-5 space-y-1.5" aria-hidden="true">
            <div className="h-1.5 w-1/3 rounded-full bg-foreground/70" />
            <div className="h-1 w-1/4 rounded-full bg-muted-foreground/30" />
            <div className="mt-3 h-px w-full bg-border" />
            <div className="h-1 w-full rounded-full bg-muted-foreground/20" />
            <div className="h-1 w-5/6 rounded-full bg-muted-foreground/20" />
            <div className="h-1 w-2/3 rounded-full bg-muted-foreground/20" />
          </div>

          <h3 className="truncate pr-7 text-sm font-semibold">{resume.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Edited {formatRelativeTime(resume.updatedAt)}
          </p>
        </Link>

        <div className="absolute right-2.5 top-2.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal />
                <span className="sr-only">Actions for {resume.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={(event) => {
                  event.preventDefault()
                  setConfirming(true)
                }}
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{resume.name}”?</DialogTitle>
            <DialogDescription>
              This removes the resume permanently. The log you imported stays.
            </DialogDescription>
          </DialogHeader>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
