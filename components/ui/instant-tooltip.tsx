'use client'

import { cloneElement, useEffect, useId, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'

/** Immediate hover/focus feedback, portaled above clipped cards and dialogs. */
export function InstantTooltip({ label, children }: {
  label: string
  children: ReactElement<{ 'aria-describedby'?: string }>
}) {
  const id = useId()
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  useEffect(() => {
    if (!position) return
    const close = () => setPosition(null)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [position])
  function show(element: HTMLElement) {
    const bounds = element.getBoundingClientRect()
    setPosition({ top: bounds.top >= 48 ? bounds.top - 8 : bounds.bottom + 40, left: Math.min(Math.max(bounds.left + bounds.width / 2, 120), window.innerWidth - 120) })
  }
  return (
    <span className="inline-flex shrink-0" onPointerEnter={event => { if (event.pointerType !== 'touch') show(event.currentTarget) }}
      onPointerLeave={() => setPosition(null)} onFocusCapture={event => show(event.currentTarget)}
      onBlurCapture={() => setPosition(null)} onKeyDown={event => { if (event.key === 'Escape') setPosition(null) }}>
      {cloneElement(children, { 'aria-describedby': position ? id : undefined })}
      {position ? createPortal(
        <span id={id} role="tooltip" className="pointer-events-none fixed z-[60] max-w-60 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-popover px-2.5 py-1.5 text-center text-xs text-popover-foreground shadow-sm"
          style={{ top: position.top, left: position.left }}>{label}</span>, document.body,
      ) : null}
    </span>
  )
}
