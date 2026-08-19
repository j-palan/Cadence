import type { Metadata, Viewport } from 'next'

import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Cadence — log your wins, get a resume',
    template: '%s · Cadence',
  },
  description:
    'Your coding agent logs what you ship. Cadence turns that log into a maintained, exportable resume.',
  openGraph: {
    title: 'Cadence — log your wins, get a resume',
    description:
      'Your coding agent logs what you ship. Cadence turns that log into a maintained, exportable resume.',
    url: APP_URL,
    siteName: 'Cadence',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#0d1117',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Dark-first: the class is fixed rather than toggled. The product is aimed at
  // developers and the light palette exists for the print/PDF path.
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
