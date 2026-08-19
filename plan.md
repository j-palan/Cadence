# cadence — Resume Log Web App

## Context

Developers using AI coding agents (Claude Code, Cursor, Copilot, Windsurf, Cline, Aider) can configure a persistent instruction that auto-logs accomplishments to a local markdown file. LogCV turns that log into a maintained, exportable resume via Claude API + a live HTML editor. Targeting a public launch with Google sign-in, onboarding, editing, and PDF export.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Pages, API routes, SSR in one repo |
| Auth | Auth.js v5 (NextAuth) + Google provider | Google-only sign-in; no passwords, no verification emails, no reset flow to build or secure |
| Database | Neon (serverless PostgreSQL) | Real Postgres, scales to zero, DB branching per Vercel preview deploy |
| ORM | Drizzle | Schema-as-TypeScript, git-tracked SQL migrations, full type inference on every query |
| AI | Anthropic Claude API (`claude-sonnet-5`) | Resume generation from log |
| Editor | CodeMirror 6 (HTML mode) | Lighter than Monaco, great syntax support |
| Styling | Tailwind CSS + shadcn/ui | Consistent components, developer aesthetic |
| PDF | Puppeteer in a Next.js API route | Full fidelity HTML→PDF; fallback: `@sparticuz/chromium` if serverless size is painful |
| Rate limiting | Upstash Redis (`@upstash/ratelimit`) | Serverless-native, free tier ample |
| Deployment | Vercel | Native Next.js, free tier sufficient to start |

**Packages:** `next-auth@beta` · `@auth/drizzle-adapter` · `drizzle-orm` · `@neondatabase/serverless` · `drizzle-kit` (dev) · `@anthropic-ai/sdk` · `@upstash/ratelimit` `@upstash/redis`

---

## Security Model — Read This First

Supabase RLS was enforcing row ownership **in the database**. That safety net is gone. With Auth.js + Drizzle, a query with no `where userId` clause returns *every user's rows* and the database will happily serve it.

The mitigation is structural, not disciplinary:

- **All database access goes through `lib/db/queries.ts`.** Every exported function takes `userId` as its first parameter. No route handler, server action, or page imports `db` directly.
- **`userId` always comes from the server session** (`await auth()`), never from a request body, query param, or client-supplied value.
- **Ownership is enforced in the `where` clause, not by a separate check.** Write `where(and(eq(resumes.id, id), eq(resumes.userId, userId)))` — a fetch-then-compare pattern leaks existence via timing and is easy to forget.
- **Lint rule** (or a code-review checklist item): flag any `import { db }` outside `lib/db/`.

Optional hardening if the app grows past a single developer: keep RLS by setting a per-request Postgres session variable (`SET LOCAL app.user_id`) inside a transaction wrapper and writing policies against `current_setting('app.user_id')`. Not worth it at launch, but the schema below is compatible with adding it later.

---

## Directory Structure

```
cadence/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx           # Single "Continue with Google" button
│   ├── (app)/                       # Protected layout (requires session)
│   │   ├── layout.tsx               # Auth guard + nav
│   │   ├── onboarding/
│   │   │   └── page.tsx             # Multi-step wizard
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Resume list
│   │   ├── resume/
│   │   │   ├── new/page.tsx         # Log import + generate
│   │   │   └── [id]/page.tsx        # Live editor
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts   # Auth.js handlers (Google callback)
│   │   ├── generate/route.ts             # POST: log → Claude → HTML resume
│   │   ├── resumes/[id]/route.ts         # PATCH: autosave
│   │   └── export-pdf/route.ts           # POST: HTML → PDF (Puppeteer)
│   └── layout.tsx                   # Root layout
├── components/
│   ├── auth/                        # Google sign-in button, sign-out menu
│   ├── onboarding/                  # Wizard steps, snippet display
│   ├── editor/                      # CodeMirror wrapper, preview iframe
│   ├── dashboard/                   # Resume cards, empty state
│   └── ui/                          # shadcn/ui re-exports
├── lib/
│   ├── db/
│   │   ├── index.ts                 # Neon client + Drizzle instance
│   │   ├── schema.ts                # Drizzle table definitions
│   │   └── queries.ts               # ALL data access; every fn takes userId
│   ├── claude.ts                    # Anthropic SDK wrapper + prompt
│   ├── pdf.ts                       # Puppeteer logic
│   ├── ratelimit.ts                 # Upstash limiter
│   └── templates/                   # 3 built-in HTML resume templates
│       ├── minimal.html
│       ├── modern.html
│       └── technical.html
├── drizzle/                         # Generated SQL migrations (committed)
├── auth.ts                          # Auth.js config (providers, adapter, callbacks)
├── middleware.ts                    # Route guard
├── drizzle.config.ts
└── .env.local
```

---

## Database Schema (`lib/db/schema.ts`)

Auth.js's Drizzle adapter owns the first four tables. `users` is extended with the app's own columns, which removes the need for a separate `profiles` table and the Supabase insert-trigger that used to populate it.

```ts
import {
  pgTable, text, timestamp, boolean, uuid, integer, primaryKey,
} from 'drizzle-orm/pg-core'
import type { AdapterAccount } from 'next-auth/adapters'

// ---- Auth.js adapter tables ----

export const users = pgTable('users', {
  id:            text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:          text('name'),
  email:         text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image:         text('image'),

  // App-specific columns (formerly the `profiles` table)
  onboarded:  boolean('onboarded').notNull().default(false),
  agents:     text('agents').array().notNull().default([]),  // ['cursor', 'claude_code', ...]
  createdAt:  timestamp('created_at').notNull().defaultNow(),
})

export const accounts = pgTable('accounts', {
  userId:            text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type:              text('type').$type<AdapterAccount['type']>().notNull(),
  provider:          text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token:     text('refresh_token'),
  access_token:      text('access_token'),
  expires_at:        integer('expires_at'),
  token_type:        text('token_type'),
  scope:             text('scope'),
  id_token:          text('id_token'),
  session_state:     text('session_state'),
}, (t) => ({
  pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
}))

export const sessions = pgTable('sessions', {
  sessionToken: text('sessionToken').primaryKey(),
  userId:       text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires:      timestamp('expires', { mode: 'date' }).notNull(),
})

export const verificationTokens = pgTable('verificationTokens', {
  identifier: text('identifier').notNull(),
  token:      text('token').notNull(),
  expires:    timestamp('expires', { mode: 'date' }).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.identifier, t.token] }),
}))

// ---- App tables ----

export const resumes = pgTable('resumes', {
  id:          uuid('id').primaryKey().defaultRandom(),
  userId:      text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name:        text('name').notNull().default('My Resume'),
  htmlContent: text('html_content').notNull().default(''),
  template:    text('template').notNull().default('minimal'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
  updatedAt:   timestamp('updated_at').notNull().defaultNow(),
})

export const logImports = pgTable('log_imports', {
  id:         uuid('id').primaryKey().defaultRandom(),
  userId:     text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  resumeId:   uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
  rawContent: text('raw_content').notNull(),
  importedAt: timestamp('imported_at').notNull().defaultNow(),
})
```

Index `resumes.userId` and `logImports.userId` — every query filters on them.

Migrations: `npx drizzle-kit generate` → review the SQL → commit it → `npx drizzle-kit migrate`. Migrations are checked into `drizzle/`, so schema history lives in git rather than in a hosted dashboard.

### Scoped data access (`lib/db/queries.ts`)

```ts
export async function listResumes(userId: string) {
  return db.select().from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt))
}

export async function getResume(userId: string, id: string) {
  const [row] = await db.select().from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .limit(1)
  return row ?? null   // not-found and not-yours are indistinguishable, by design
}

export async function updateResumeHtml(userId: string, id: string, html: string) {
  const [row] = await db.update(resumes)
    .set({ htmlContent: html, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning()
  return row ?? null   // null means the row didn't exist OR wasn't theirs → 404
}
```

---

## Auth Config (`auth.ts`)

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import { DrizzleAdapter } from '@auth/drizzle-adapter'
import { db } from '@/lib/db'
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [Google],
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: {
    // Expose id + onboarded on the session so the layout can gate without a query
    session({ session, user }) {
      session.user.id = user.id
      session.user.onboarded = (user as any).onboarded
      return session
    },
  },
})
```

Database sessions (not JWT) so sign-out and account deletion take effect immediately, and so `onboarded` is always read fresh rather than baked into a stale token.

---

## Routes & Pages

| Route | Purpose |
|---|---|
| `/` | Landing page (hero, how it works, agent logos, CTA) |
| `/login` | Single "Continue with Google" button |
| `/api/auth/*` | Auth.js handlers (Google redirect + callback) |
| `/onboarding` | 3-step wizard; gated: redirect here after first login if `users.onboarded = false` |
| `/dashboard` | Resume cards grid; "New Resume" button |
| `/resume/new` | Log import page → triggers generation → redirects to editor |
| `/resume/[id]` | Split-pane editor (CodeMirror + iframe preview) |
| `/settings` | Connected Google account, delete account |

Deleted vs. the previous plan: `/signup`, `/verify`, `/reset-password`, `/auth/callback`. Google owns identity, so there is no password to set, no email to verify, and nothing to reset.

---

## Auth Flow

```
Sign in (same path for new and returning users):
  1. User clicks "Continue with Google" → signIn('google')
  2. Google consent screen → redirects to /api/auth/callback/google
  3. Auth.js adapter upserts users + accounts rows, creates a session row,
     sets an httpOnly session cookie
  4. Redirect to /dashboard

Onboarding gate:
  app/(app)/layout.tsx runs `const session = await auth()`
    - no session          → redirect('/login')
    - !session.user.onboarded && path !== '/onboarding' → redirect('/onboarding')

Route protection:
  middleware.ts wraps Auth.js `auth` and matches ['/dashboard/:path*',
  '/resume/:path*', '/onboarding', '/settings']. Cheap cookie presence
  check only — the real authorization is the `await auth()` call in the
  protected layout and in every route handler.

Sign out:
  signOut() deletes the session row and clears the cookie.

Account deletion (/settings):
  Delete the users row; `on delete cascade` removes accounts, sessions,
  resumes, and log_imports.
```

No email verification step: Google has already verified the address. Trust `email_verified` from the Google profile and store it in `users.emailVerified`.

---

## Onboarding Wizard (3 Steps)

**Step 1 — Pick your agent(s)**
Checkbox grid: Claude Code, Cursor, GitHub Copilot, Windsurf, Cline, Aider. Saves to `users.agents[]`.

**Step 2 — Add the logging instruction**
Tab per selected agent. Shows the exact snippet to paste into their config file, with the file path. One-click copy button. Snippet is ~5 lines of natural language telling the agent to auto-log accomplishments to `~/logcv-log.md` (standardized path across all agents for simplicity).

**Step 3 — Done**
"Go code something great. Come back in a week." → button to dashboard. Sets `users.onboarded = true`.

---

## Resume Generation Flow

```
/resume/new:
  1. User chooses import method:
     a. Paste (textarea)
     b. "Open file" button → File System Access API
        - window.showOpenFilePicker() → reads ~/logcv-log.md
        - Graceful fallback: button hidden in Firefox/Safari, paste shown instead

  2. User selects a starting template (3 options, thumbnail previews)

  3. "Generate Resume" → POST /api/generate
     - Body: { log: string, template: string, existingHtml?: string }
     - userId comes from `await auth()`, never from the body
     - Upstash rate limit checked before the Claude call
     - Streams Claude response back
     - On complete: INSERT into resumes, INSERT into log_imports (both scoped to userId)
     - Redirect to /resume/[id]
```

---

## Claude Prompt Strategy (`lib/claude.ts`)

```
System:
  You are an expert technical resume writer. You write concise,
  impact-first bullet points in past tense. Use strong action verbs.
  Quantify achievements where the log provides data. Output ONLY valid
  HTML — no markdown fences, no explanation. Slot the content into the
  provided template exactly, replacing placeholder sections. Do not add
  sections that have no content in the log.

User:
  Here is a developer's work log:
  <log>
  {log_content}
  </log>

  Here is the HTML resume template to fill:
  <template>
  {template_html}
  </template>

  {if existingHtml:}
  Here is their current resume. Merge new accomplishments in; do not
  remove existing content unless it is duplicated by the log:
  <current_resume>
  {existingHtml}
  </current_resume>

  Return the complete updated HTML resume.
```

Use streaming (`stream: true`) so the editor shows content arriving in real time.

---

## Live Editor (`/resume/[id]`)

```
Layout: two-column, 50/50, resizable via drag handle

Left pane:
  - CodeMirror 6 with @codemirror/lang-html
  - Auto-save debounce: 1.5s after last keystroke → PATCH /api/resumes/[id]
    → updateResumeHtml(session.user.id, id, html); null return → 404
  - Toolbar: [Template ▾] [Regenerate from log] [Export PDF] [Share (future)]

Right pane:
  - <iframe srcdoc={html} /> — updates on every editor change
  - sandboxed (no scripts in preview)

Template switcher:
  - Dropdown of 3 templates
  - Switching replaces only the <head> and structural wrapper,
    preserving the user's content sections (parse + re-slot)
```

---

## PDF Export (`/api/export-pdf`)

```
POST body: { html: string, filename: string }

Server:
  1. Puppeteer launches headless Chrome
  2. page.setContent(html) with base styles injected
  3. page.pdf({ format: 'A4', printBackground: true })
  4. Stream buffer back as application/pdf

Client:
  Receives blob → creates object URL → triggers download
```

If Puppeteer is too heavy for Vercel serverless (250MB limit), deploy `/api/export-pdf` with `maxDuration: 60` and the `@sparticuz/chromium` package (lightweight Chromium for serverless).

---

## Environment Variables

```bash
# Auth.js
AUTH_SECRET=                     # openssl rand -base64 32
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_URL=https://logcv.com       # omit locally; Auth.js infers on Vercel

# Neon
DATABASE_URL=                    # pooled connection string (app runtime)
DATABASE_URL_UNPOOLED=           # direct connection (drizzle-kit migrations)

# Anthropic
ANTHROPIC_API_KEY=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App
NEXT_PUBLIC_APP_URL=https://logcv.com
```

`SUPABASE_SERVICE_ROLE_KEY` is gone — there is no privileged bypass key to leak. Server code reaches the DB with one credential, and authorization is the `where` clause.

---

## UI Design Direction

Developer-audience aesthetic: dark-first, monospace accents, minimal chrome.

- **Ground**: `#0D1117` dark / `#F6F8FA` light
- **Text**: `#E6EDF3` dark / `#1F2328` light
- **Accent**: `#58A6FF` (GitHub blue — familiar to the audience)
- **Success/active**: `#3FB950`
- **Type**: `-apple-system` system sans for UI; `ui-monospace, 'SF Mono', Consolas` for code/snippets/log preview
- **No rounded-everything**: sharp-cornered cards with 4px radius max; clear borders over shadows
- Landing page: above the fold shows an animated split-pane (log on left, resume generating on right). No hero image.

---

## Landing Page Sections

1. **Hero**: headline + live demo animation (log → resume typewriter effect)
2. **How it works**: 3 steps (add snippet → code → import & generate)
3. **Agent logos**: Claude Code, Cursor, Copilot, Windsurf, Cline, Aider
4. **Editor preview**: screenshot/video of split pane
5. **CTA**: "Continue with Google"

---

## Launch Checklist

- [ ] Google Cloud project created; OAuth consent screen configured (app name, logo, support email, ToS + privacy URLs)
- [ ] Consent screen **published** (not left in Testing — Testing caps you at 100 users)
- [ ] Scopes limited to `openid email profile` — these are non-sensitive, so no Google verification review is required. Adding anything beyond them triggers a multi-week review.
- [ ] Authorized redirect URIs registered for **both** prod and preview: `https://logcv.com/api/auth/callback/google`, `http://localhost:3000/api/auth/callback/google`
- [ ] `AUTH_SECRET` generated and set in Vercel (a different value per environment)
- [ ] Neon project created; pooled + unpooled connection strings in Vercel env
- [ ] Initial migration generated, reviewed, committed, and applied to prod
- [ ] Neon branching wired to Vercel preview deploys (each PR gets an isolated DB)
- [ ] **Ownership audit**: every `lib/db/queries.ts` export filters on `userId`; no `import { db }` outside `lib/db/`
- [ ] **Authorization audit**: every route handler derives `userId` from `await auth()`, never from the request
- [ ] Rate limit `/api/generate` (1 generation per 10s per user) via `@upstash/ratelimit`
- [ ] Puppeteer PDF route tested on Vercel (use `@sparticuz/chromium` if needed)
- [ ] File System Access API path: tested in Chrome, graceful fallback in Firefox/Safari
- [ ] Account deletion verified to cascade across accounts, sessions, resumes, log_imports
- [ ] Error boundaries on editor page (CodeMirror crash should not lose content)
- [ ] Terms of service + privacy policy pages (required for the Google consent screen)
- [ ] Basic analytics (Plausible or Vercel Analytics — privacy-friendly)

---

## Build Order

1. Neon project + Drizzle schema + first migration
2. Next.js scaffold, Tailwind, shadcn/ui
3. Auth.js config, Google provider, `/login`, middleware, protected layout
4. `lib/db/queries.ts` scoped data-access layer
5. Onboarding wizard
6. Claude prompt + `/api/generate` route (streaming, rate-limited)
7. `/resume/new` import page
8. CodeMirror editor + iframe preview
9. Auto-save + PATCH route
10. Dashboard
11. PDF export
12. Settings page (+ account deletion)
13. Landing page
14. Polish + launch checklist
