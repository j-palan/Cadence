# Cadence

Log your wins as they happen. Cadence turns them into a resume.

Your coding agent already knows what you shipped this week. Give it one
instruction and it appends each win to `~/cadence-log.md` as it happens. Cadence
turns that log into a LaTeX resume and hands you an Overleaf-style editor —
source on the left, compiled PDF on the right — starting from
[Jake's Resume](https://github.com/jakegut/resume).

---

## Quickstart

Five commands, assuming you have Node 20+ and Homebrew:

```bash
npm install
brew install tectonic          # the LaTeX engine
cp .env.example .env.local     # then fill in DATABASE_URL + AUTH_SECRET
npm run db:migrate             # create the tables
npm run tex:warm               # ~20s once, so no page load pays for it
npm run dev                    # http://localhost:3003
```

The detail behind each step is below. Only **Node**, **a Postgres database**, and
**a LaTeX engine** are actually required — Google OAuth, the Anthropic key, and
Upstash all degrade gracefully so you can get the app on screen first and add
them as you need them.

---

## Prerequisites

| Requirement | Why | Notes |
|---|---|---|
| **Node 20+** | Next.js 14 | Built and tested on Node 22 |
| **A LaTeX engine** | Compiling resumes to PDF | `brew install tectonic` — one ~30MB binary that downloads only the packages a document uses. An existing TeX Live / MacTeX install works too; Cadence falls back to `pdflatex`. |
| **A Postgres database** | Users, resumes, logs | A free [Neon](https://neon.tech) project is the path of least resistance — it is serverless, so there is nothing to run locally. |
| **An Anthropic API key** | Generating a resume from a log | Optional. Without it the editor works fine; only "Generate from log" is unavailable. |

### On the LaTeX engine

Tectonic is XeTeX-based, so it is not byte-identical to the pdfLaTeX most people
compile Jake's Resume with. The bundled template guards the two pdfTeX-only
lines (`\pdfgentounicode`, which exists to keep the PDF ATS-parsable) behind an
`\ifdefined`, so the same source compiles under `pdflatex`, `xelatex`, and
Tectonic alike. XeTeX emits Unicode-mapped text natively, so nothing is lost.

Verified locally: Jake's Resume compiles to a single-page, 33KB PDF in **~520ms**
warm. The **first** compile on a cold cache takes **~20s**, almost all of it
downloading support files — which is what `npm run tex:warm` is for.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install the LaTeX engine

```bash
brew install tectonic
```

Linux, or without Homebrew: see [tectonic-typesetting.github.io](https://tectonic-typesetting.github.io/en-US/install.html).
If your engine is not on `PATH`, set `TECTONIC_PATH` or `PDFLATEX_PATH` in
`.env.local`.

Check it worked:

```bash
npm run tex:warm
```

That compiles the bundled template once and populates the package cache. Re-run
it any time; a warm cache makes it a ~0.5s no-op. Without it, the first person
to open the editor waits out the download.

### 3. Configure the environment

```bash
cp .env.example .env.local
```

`.env.example` documents every variable. The two you cannot skip:

```bash
# Generate with: openssl rand -base64 32
AUTH_SECRET=

# From your Neon dashboard's connection details — you need both strings.
DATABASE_URL=           # pooled   — the app at runtime
DATABASE_URL_UNPOOLED=  # direct   — drizzle-kit migrations
```

Add your Anthropic key when you want resume generation:

```bash
ANTHROPIC_API_KEY=      # console.anthropic.com/settings/keys
```

### 4. Create the tables

```bash
npm run db:migrate
```

The migration in `drizzle/` is committed, so this applies a reviewed SQL file
rather than inferring a schema. After changing `lib/db/schema.ts`:

```bash
npm run db:generate    # write a new migration
# review the SQL, commit it
npm run db:migrate     # apply it
```

### 5. Run it

```bash
npm run dev
```

---

## Signing in locally

Google is the only identity provider in production, but standing up a Google
Cloud project just to see the app is a poor first five minutes. So with
`AUTH_DEV_LOGIN=true` (already set in `.env.example`) the login page offers a
**"Sign in without Google"** form that takes any email and creates a session
directly.

This is double-gated: the route behind it returns **404** unless
`AUTH_DEV_LOGIN` is the literal string `true` **and** `NODE_ENV` is not
`production`. Setting the flag in a deployed environment does not switch it on.

### Wiring up real Google sign-in

1. Create a project in the [Google Cloud console](https://console.cloud.google.com/).
2. Configure the OAuth consent screen. Keep the scopes to `openid email profile`
   — those are non-sensitive and need no verification review. Anything beyond
   them triggers a multi-week process.
3. Create an OAuth 2.0 Client ID (type: Web application) and register the
   redirect URI:
   ```
   http://localhost:3003/api/auth/callback/google
   ```
4. Put the client ID and secret in `.env.local` as `AUTH_GOOGLE_ID` and
   `AUTH_GOOGLE_SECRET`.

The login page shows the Google button as soon as both are present.

---

## Using it

1. **Onboarding** picks your agents and hands you the snippet for each. Paste it
   into the config file shown (`~/.claude/CLAUDE.md`, `.cursor/rules/`,
   `.github/copilot-instructions.md`, …). Claude Code, Cursor, Copilot,
   Windsurf, Cline, and Aider are covered.
2. **Go code.** Your agent appends to `~/cadence-log.md` as you ship.
3. **New resume** → paste the log (or open the file directly, in Chromium) →
   *Generate from log*. Claude drafts the LaTeX, streaming as it goes. Or
   *Skip — edit the template myself* to go straight to Jake's Resume.
4. **The editor** autosaves 1.5s after you stop typing and recompiles shortly
   after. `⌘S` does both immediately. Compiler errors arrive with line numbers,
   and the full TeX log is one click away. *PDF* downloads what the engine
   produced.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3003 |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the data-access rule below |
| `npm run tex:warm` | Populate the LaTeX package cache |
| `npm run db:generate` | Write a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

---

## Architecture

```
app/
  (auth)/login/          Google button + the dev sign-in escape hatch
  (app)/                 Protected: layout runs `await auth()` and gates onboarding
    onboarding/          3-step wizard
    dashboard/           Resume cards
    resume/new/          Log import → generate
    resume/[id]/         The LaTeX editor
    settings/            Account, agent snippets, deletion
  api/
    auth/[...nextauth]/  Auth.js handlers
    generate/            POST: log → Claude → LaTeX (streamed)
    compile/             POST: LaTeX → PDF (Tectonic / pdflatex)
    resumes/             POST create from template; PATCH/DELETE by id
    account/             DELETE: cascades to everything
lib/
  db/queries.ts          ALL data access; every function takes userId first
  latex.ts               Engine invocation, sandboxing, log parsing
  claude.ts              Anthropic wrapper + the generation prompt
  templates/jake.tex     The resume template
  agents.ts              Per-agent snippets and config paths
```

### The security model worth knowing about

There is no row-level security behind the database client. A query missing its
`where userId` clause returns **every user's rows**, and Postgres will serve it
happily. Three structural rules contain that, rather than relying on
remembering:

1. **All data access goes through `lib/db/queries.ts`**, where `userId` is the
   first parameter of every exported function. An ESLint rule fails the build on
   `import { db }` outside `lib/db/`.
2. **`userId` always comes from the server session** (`await auth()`) — never
   from a request body, query param, or anything else the client controls.
3. **Ownership lives in the `where` clause**, not a separate check:
   `where(and(eq(resumes.id, id), eq(resumes.userId, userId)))`. Single-row
   lookups return `null` for both "no such row" and "not yours", so the two are
   indistinguishable to a caller and both become a 404.

The middleware is *not* an authorization boundary — sessions live in the
database, which the edge runtime cannot reach, so it only checks for a cookie to
bounce obviously signed-out visitors. The real check is `await auth()` in
`app/(app)/layout.tsx` and in every route handler.

### Compiling untrusted LaTeX

TeX is a programming language: `\write18` can run shell commands and `\input`
can read arbitrary files. `lib/latex.ts` contains that with shell escape
disabled (`--untrusted` / `-no-shell-escape`), `openin_any` / `openout_any` set
to paranoid so file I/O stays in a per-request temp directory, a 60s wall-clock
timeout, and cleanup in a `finally`. Only the shared package cache is writable
across requests, and only the engine writes to it.

---

## Deploying

The LaTeX engine is a native binary, so `/api/compile` needs a runtime that can
execute one — **a container or a VM, not Vercel's serverless functions.** Build a
image on a base with Tectonic installed, or run `next start` on a host where it
is on `PATH`. Everything else (Neon, Auth.js, Upstash) is platform-agnostic.

Also set for production:

- `AUTH_URL` and `NEXT_PUBLIC_APP_URL` to the real origin
- The Google redirect URI for that origin
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — `/api/generate` is the
  one route that costs money per call, and without these it runs unthrottled
  (the server logs an error saying so)
- `CADENCE_TEX_CACHE` to a persistent writable path, and warm it during the
  image build

---

## Credits

The resume template is [Jake's Resume](https://github.com/jakegut/resume) by
Jake Gutierrez, MIT licensed, based in turn on
[sb2nov/resume](https://github.com/sb2nov/resume). It is bundled as
`lib/templates/jake.tex` with the pdfTeX-only lines guarded so it compiles on
more engines.
