import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Privacy policy' }

// Kept as a literal rather than imported from lib/gemini — that module is
// server-only and pulls in the whole SDK for one string.
const GENERATION_MODEL = 'gemini-3.6-flash'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="19 August 2026">
      <section className="space-y-2">
        <h2>What is stored</h2>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Your Google profile:</strong> name, email address, and avatar URL, from the
            <span className="font-mono"> openid email profile</span> scopes. Nothing else is
            requested.
          </li>
          <li>
            <strong>Your resumes:</strong> the LaTeX source you write or generate.
          </li>
          <li>
            <strong>Your imported logs:</strong> the log text you paste or open, kept so a resume
            can be regenerated later.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2>Who it is shared with</h2>
        <p>
          To generate a resume, your log and resume text are sent to a language-model provider. By
          default that is Google&apos;s Gemini API using the{' '}
          <span className="font-mono">{GENERATION_MODEL}</span> model on Cadence&apos;s key. Note
          that Google&apos;s free tier may use submitted content to improve their models — see{' '}
          <a
            href="https://ai.google.dev/gemini-api/terms"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-foreground"
          >
            the Gemini API terms
          </a>
          .
        </p>
        <p>
          If you add your own API key in Settings, your content goes to the provider you chose
          instead, under <strong>your</strong> agreement with them rather than Cadence&apos;s. Your
          key is encrypted before storage, is never returned to the browser, and is used only to
          generate your own resumes. Removing it in Settings deletes it.
        </p>
        <p>Nothing is sold. Data is stored in a managed Postgres database.</p>
      </section>

      <section className="space-y-2">
        <h2>What is not collected</h2>
        <p>
          No passwords — Google handles authentication. No advertising or cross-site tracking
          cookies. The only cookie is the session cookie that keeps you signed in.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Deleting your data</h2>
        <p>
          Settings → Delete account removes your user record, and the database cascades that
          deletion to your sessions, connected Google account, resumes, and imported logs. It is
          immediate and irreversible.
        </p>
      </section>
    </LegalPage>
  )
}
