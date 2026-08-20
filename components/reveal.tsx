'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Reveals its children once, when they first scroll into view.
 *
 * IntersectionObserver plus a CSS transition rather than an animation library —
 * the whole effect is opacity and a 10px translate, which is not worth a
 * dependency. The observer disconnects after firing so scrolling back up does
 * not replay it.
 *
 * The content is always present in the HTML (only transparent), so crawlers and
 * assistive tech are unaffected, and a <noscript> rule in globals.css makes it
 * visible when JavaScript never runs. The reduced-motion rule collapses the
 * transition to zero, which turns this into an instant appearance.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  /** Milliseconds, for staggering siblings. Keep the spread under ~250ms total. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Already in view on load (the hero): fire immediately rather than waiting
    // for a scroll that may never come.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setShown(true)
        observer.disconnect()
      },
      // Trigger slightly before the element is fully in view, so the motion has
      // finished by the time the reader's eye arrives.
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn('reveal', shown && 'reveal-in', className)}
    >
      {children}
    </div>
  )
}
