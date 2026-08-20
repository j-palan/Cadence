import { Plus } from 'lucide-react'

/**
 * FAQ built on native <details>/<summary>.
 *
 * No accordion library and no client JavaScript: the browser handles open/close,
 * keyboard interaction, and screen-reader semantics for free, and the answers
 * remain readable even if JS never loads. Only the icon rotation and a short
 * content fade are styled.
 *
 * Answers are plain strings rather than JSX so the FAQPage structured data below
 * can carry the real text. Keeping a separate string copy for search engines
 * would guarantee the two drift apart.
 *
 * The content is deliberately concrete, including the unflattering parts — the
 * free tier's training terms belong in a FAQ precisely because someone would
 * want to know before pasting a work history in.
 */
interface Faq {
  q: string
  a: string
}

const FAQS: Faq[] = [
  {
    q: 'Do I have to write the log myself?',
    a: "No — that's the point. You paste a short instruction into your coding agent's config once, and from then on it appends each win to a markdown file as the work happens. Claude Code, Cursor, GitHub Copilot, Windsurf, Cline and Aider all have a snippet ready in onboarding. Any agent that reads an instructions file works; the snippet is plain English, not an integration.",
  },
  {
    q: "What if I don't use a coding agent?",
    a: "It still works, you just keep the log yourself — it's an ordinary markdown file, and Cadence only ever reads text. You can also skip generation entirely and edit the LaTeX template by hand; the editor is a real editor.",
  },
  {
    q: 'Will it invent things to fill the page?',
    a: "No. The prompts forbid inventing numbers, employers, job titles, dates, degrees or technologies — if your log doesn't say it, it doesn't go in. Tailoring is stricter still: it will match a posting's vocabulary for work you actually did, but if the job asks for Kubernetes and your resume never mentions it, the tailored version still doesn't. It also won't quietly drop a real skill to look more focused.",
  },
  {
    q: 'Do I need to know LaTeX?',
    a: 'Not to get a resume. Generation produces a complete, compiling document and the PDF appears beside it. LaTeX is there when you want precise control — and because a real TeX engine renders it, the PDF you download is exactly what you saw, not an approximation.',
  },
  {
    q: 'Why is everything forced onto one page?',
    a: "Because that's what gets read. Cadence holds each resume to one page by default: 4–5 bullets a job, 1–2 a project, each bullet sized to a single line. When new material arrives it displaces the weakest bullets rather than spilling over. If you want something else, the instructions box on Update and Tailor overrides those defaults.",
  },
  {
    q: 'Where does my log actually go?',
    a: "To a language model, to be turned into a resume. By default that's Google's Gemini API on our key — and Google's free tier may use submitted content to improve their models, which is worth knowing before you paste anything sensitive. Add your own API key in Settings and your content goes to your provider under your agreement instead. Keys are encrypted before storage and never sent back to the browser.",
  },
  {
    q: 'What happens if I stop using it?',
    a: "Download the PDF any time — it's yours, and it's a normal file. Deleting your account removes your resumes and imported logs with it, immediately and irreversibly.",
  },
]

export function Faq() {
  return (
    <>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {FAQS.map((faq, index) => (
          <details
            key={faq.q}
            className="group stagger-item"
            style={{ '--stagger-index': index } as React.CSSProperties}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-5 text-sm font-medium transition-colors hover:text-success [&::-webkit-details-marker]:hidden">
              {faq.q}
              <Plus
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-45 group-open:text-success"
              />
            </summary>
            <div className="animate-fade-up px-5 pb-5 pr-12 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </div>
          </details>
        ))}
      </div>

      {/* Structured data, so these answers can surface in search results. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((faq) => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          }),
        }}
      />
    </>
  )
}
