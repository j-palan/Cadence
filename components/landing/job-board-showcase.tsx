import Link from 'next/link'
import { ArrowRight, Bookmark, BriefcaseBusiness, Check, Target } from 'lucide-react'

import { CompanyAvatar } from '@/components/jobs/company-avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const EXAMPLES = [
  { company: 'Stripe', role: 'Software Engineer Intern', location: 'Toronto, Canada', fit: '75%', skills: 'Java · Python · React', count: 2 },
  { company: 'Databricks', role: 'Software Engineering Intern', location: 'San Francisco, US', fit: '60%', skills: 'Python · SQL', count: 3 },
]

export function JobBoardShowcase({ href }: { href: string }) {
  return (
    <section id="job-board" className="border-t border-border">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 py-24 sm:py-28 lg:grid-cols-2 lg:gap-12">
        <div>
          <p className="flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
            <BriefcaseBusiness aria-hidden="true" className="h-3.5 w-3.5" />Job board
          </p>
          <h2 className="text-display-sm mt-4">Find where your resume fits.</h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Discover software engineering internships in the US and Canada, see how your resume lines up, and tailor it for the roles you want.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            {['Fresh postings from employer job boards', 'Resume-fit scores with evidence you can inspect', 'Grouped by company, so more options stay in view'].map(item => (
              <li key={item} className="flex items-start gap-2.5"><Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />{item}</li>
            ))}
          </ul>
          <Button asChild className="mt-8 group" block>
            <Link href={href}>Explore the job board<ArrowRight aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" /></Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">No API key needed for fit scores.</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-5 py-4">
            <p className="text-sm font-semibold">Your next role</p>
            <Badge variant="outline">Matched to your resume</Badge>
          </div>
          <div className="space-y-3 p-4">
            {EXAMPLES.map(example => (
              <div key={example.company} className="overflow-hidden rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <CompanyAvatar company={example.company} />
                  <div className="flex-1"><p className="text-sm font-semibold">{example.company}</p><p className="mt-0.5 text-xs text-muted-foreground">{example.count} opportunities</p></div>
                  <Bookmark aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{example.role}</p>
                    <Badge variant="success" className="shrink-0">{example.fit} fit</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{example.location}</p>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Target aria-hidden="true" className="h-3 w-3 shrink-0" />{example.skills}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="px-4 pb-4 text-xs text-muted-foreground">Illustrative preview. Postings and fit scores vary by resume.</p>
        </div>
      </div>
    </section>
  )
}
