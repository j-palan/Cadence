import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'

import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3003'

// Geometric sans for UI and display type; mono for snippets and LaTeX.
const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
})

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f1ee' },
    { media: '(prefers-color-scheme: dark)', color: '#0f0f0f' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {/* Light by default. `enableSystem` is off deliberately: a first-time
            visitor on a dark-mode OS should still see the light design, and the
            toggle is what changes it. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
