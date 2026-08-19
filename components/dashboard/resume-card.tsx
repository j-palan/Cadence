'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Loader2, MoreHorizontal, Trash2 } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { templateName } from '@/lib/templates/meta'
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
      <div className="group relative rounded-lg border border-border bg-card transition-colors hover:border-muted-foreground/40">
        <Link href={`/resume/${resume.id}`} className="block space-y-3 p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <Badge variant="outline">{templateName(resume.template)}</Badge>
          </div>
          <div className="space-y-1">
            <h3 className="truncate pr-8 font-medium leading-tight">{resume.name}</h3>
            <p className="text-xs text-muted-foreground">
              Edited {formatRelativeTime(resume.updatedAt)}
            </p>
          </div>
        </Link>

        <div className="absolute right-3 top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground opacity-0 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <MoreHorizontal />
                <span className="sr-only">Resume actions</span>
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
