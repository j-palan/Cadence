import type { Metadata } from 'next'

import { LegalPage } from '@/components/legal-page'

export const metadata: Metadata = { title: 'Terms of service' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="19 August 2026">
      <section className="space-y-2">
        <h2>The short version</h2>
        <p>
          Cadence turns a work log into a LaTeX resume. You keep ownership of everything you write
          and everything the service generates for you. Use it for your own resume.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Your account</h2>
        <p>
          Sign-in is handled by Google. You are responsible for the security of the Google account
          you use. You can delete your Cadence account at any time from settings, which removes
          your resumes and imported logs along with it.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Generated content</h2>
        <p>
          Resumes are drafted by a language model from the log you provide. Models make mistakes:
          <strong> read every line before you send a resume to anyone.</strong> You are responsible
          for the accuracy of what you submit to an employer, including dates, titles, and metrics.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Acceptable use</h2>
        <p>
          Do not use Cadence to fabricate credentials or employment history, to generate resumes for
          someone else without their involvement, or to attempt to compile LaTeX that attacks the
          service or other users.
        </p>
      </section>

      <section className="space-y-2">
        <h2>Availability</h2>
        <p>
          The service is provided as-is, without warranty. It may change or become unavailable.
          Export a PDF of anything you care about keeping.
        </p>
      </section>
    </LegalPage>
  )
}
