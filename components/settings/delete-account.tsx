'use client'

import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const CONFIRM_WORD = 'delete'

export function DeleteAccount({ email }: { email: string }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function destroy() {
    setPending(true)
    setError(null)

    try {
      const response = await fetch('/api/account', { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not delete your account.')

      // A full navigation, not a router push — every cached server-rendered
      // page for this session is now invalid.
      window.location.href = '/'
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete your account.')
      setPending(false)
    }
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 />
        Delete account
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This deletes <span className="font-mono">{email}</span> along with every resume and
              imported log. It cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-1.5">
            <Label htmlFor="confirm-delete" className="text-xs text-muted-foreground">
              Type <span className="font-mono text-foreground">{CONFIRM_WORD}</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="off"
              className="font-mono"
            />
          </div>

          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={destroy}
              disabled={pending || confirm.trim().toLowerCase() !== CONFIRM_WORD}
            >
              {pending ? <Loader2 className="animate-spin" /> : null}
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
