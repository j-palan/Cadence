# Cadence

Log your wins as they happen. Cadence turns them into a resume.

Your coding agent already knows what you shipped this week. Give it one
instruction and it appends each win to `~/cadence-log.md` as it happens. Cadence
turns that log into a LaTeX resume and hands you an Overleaf-style editor —
source on the left, compiled PDF on the right — starting from
[Jake's Resume](https://github.com/jakegut/resume).

---

## Quickstart

Assuming Node 20+, Homebrew, and [go-task](https://taskfile.dev):

```bash
brew install tectonic go-task  # LaTeX engine + task runner
cp .env.example .env.local     # then fill in DATABASE_URL + AUTH_SECRET
task setup                     # deps, pdf worker, migrations, TeX cache
task start                     # http://localhost:3003
```

Without go-task, the equivalent is `npm install && npm run pdf:worker &&
npm run db:migrate && npm run tex:warm && npm run dev`.

The detail behind each step is below. Only **Node**, **a Postgres database**, and
**a LaTeX engine** are actually required — Google OAuth, the Gemini key, and
Upstash all degrade gracefully so you can get the app on screen first and add
them as you need them.

---

## Prerequisites

| Requirement | Why | Notes |
|---|---|---|
| **Node 20+** | Next.js 14 | Built and tested on Node 22 |
| **A LaTeX engine** | Compiling resumes to PDF | `brew install tectonic` — one ~30MB binary that downloads only the packages a document uses. An existing TeX Live / MacTeX install works too; Cadence falls back to `pdflatex`. |
| **A Postgres database** | Users, resumes, logs | A free [Neon](https://neon.tech) project is the path of least resistance — it is serverless, so there is nothing to run locally. |
| **A Gemini API key** | Generating a resume from a log (users can also bring their own — see below) | Optional, and free — get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Without it the editor works fine; only generation is unavailable. |

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

Add your Gemini key when you want resume generation (the free tier is enough):

```bash
GEMINI_API_KEY=         # aistudio.google.com/apikey
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

## Signing in

Google is the only identity provider, so you need a Google Cloud OAuth client
before you can get past `/login`.

1. Create a project in the [Google Cloud console](https://console.cloud.google.com/).
2. Configure the OAuth consent screen. Keep the scopes to `openid email profile`
   — those are non-sensitive and need no verification review. Anything beyond
   them triggers a multi-week process. Leave it in **Testing** and add yourself
   under *Test users* while developing; publishing (capped at 100 users until you
   do) needs the Terms and Privacy URLs, which the app serves at `/terms` and
   `/privacy`.
3. Create an OAuth 2.0 Client ID (type: **Web application**) and register the
   redirect URI — the port matters:
   ```
   http://localhost:3003/api/auth/callback/google
   ```
4. Put the client ID and secret in `.env.local`:
   ```bash
   AUTH_GOOGLE_ID=
   AUTH_GOOGLE_SECRET=
   ```

The login page shows the Google button as soon as both are present, and explains
what is missing when they are not.

Sessions live in the database rather than a JWT, so signing out and deleting an
account take effect immediately instead of waiting for a token to expire.

## Bringing your own model

Generation runs on the server's Gemini key by default. Settings → **Model** lets
a user store their own provider key and pick any model in the catalog
(`lib/ai/catalog.ts` — Gemini and Anthropic today). It can be switched off at any
time, which reverts to the default without discarding the key, or removed
entirely. The settings card always names the model actually in use and whose key
is paying for it.

How keys are handled:

- **Verified before storage.** Saving makes a minimal real call to the provider,
  so a typo or a wrong model is caught while the field is still on screen.
- **Encrypted at rest** with AES-256-GCM and a per-record IV, keyed by HKDF from
  `BYOK_ENCRYPTION_KEY` (falling back to `AUTH_SECRET`). Tampering fails closed.
- **Never returned to the browser.** The client only ever receives the last four
  characters. `getAiSettingsForClient` is the only reader a page may call;
  `getAiCredentials` returns ciphertext and is server-only.
- **Never silently redirected.** Cadence retries its own default key across
  fallback models when the free tier is busy, but a user's own key only ever runs
  the model they chose — it is their bill.

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

## Running it

The dev server runs in the background, so `task start` returns once it is ready
rather than occupying a terminal:

| Command | What it does |
|---|---|
| `task start` | Start the dev server in the background; waits for ready |
| `task stop` | Stop it |
| `task restart` | Both |
| `task status` | Whether it is up, and what it answers with |
| `task logs` | Follow its output |
| `task doctor` | Check prerequisites and which env vars are set |
| `task setup` | One-time: deps, pdf worker, migrations, TeX cache |
| `task check` | Typecheck, lint, build |

`task start` is idempotent — running it twice will not start a second server.
Override the port with `task start PORT=3010`; every command takes the same flag,
so `task stop PORT=3010` stops only that one.

Stopping targets this project's port and pidfile only. Avoid
`pkill -f "next dev"` — it matches every Next dev server on the machine, not
just this one.

`task logs` needs a terminal; use `npm run dev` if you would rather have the
server in the foreground and `Ctrl+C` it.

## Scripts

Underlying npm scripts, if you prefer them or don't have go-task:

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3003, in the foreground |
| `npm run build` / `npm start` | Production build and serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint, including the data-access rule below |
| `npm run tex:warm` | Populate the LaTeX package cache |
| `npm run pdf:worker` | Copy the pdf.js worker into `public/` (runs on install) |
| `npm run db:generate` | Write a migration from schema changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Browse the database |

---

## Architecture

```
app/
  (auth)/login/          Google sign-in
  (app)/                 Protected: layout runs `await auth()` and gates onboarding
    onboarding/          3-step wizard
    dashboard/           Resume cards
    resume/new/          Log import → generate
    resume/[id]/         The LaTeX editor
    settings/            Account, agent snippets, deletion
  api/
    auth/[...nextauth]/  Auth.js handlers (Google redirect + callback)
    generate/            POST: log → Gemini → LaTeX (streamed); 3 modes
    compile/             POST: LaTeX → PDF (Tectonic / pdflatex)
    resumes/             POST create from template; PATCH/DELETE by id
    account/             DELETE: cascades to everything
lib/
  db/queries.ts          ALL data access; every function takes userId first
  latex.ts               Engine invocation, sandboxing, log parsing
  generate.ts            Prompt assembly, streaming, retry/fallback
  prompts.ts             The three system prompts (create / update / tailor)
  ai/
    catalog.ts           Supported providers and models (isomorphic)
    crypto.ts            AES-256-GCM for user-supplied API keys
    engine.ts            Resolves own-key vs. default per request
    providers.ts         One streaming interface over Gemini and Anthropic
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

`/api/compile` shells out to a TeX binary, so Cadence needs a runtime that can
execute one. **That rules out Vercel's serverless functions** — everything else
works there, but PDF preview and download return 503. Deploy the container
instead; the `Dockerfile` is the supported target and works on Railway, Render,
Fly.io, or Cloud Run.

```bash
docker build -t cadence .
docker run -p 3000:3000 --env-file .env.local cadence
```

The image is two-stage on purpose. Build-only dependencies are about 1.2GB and
useless at runtime, and pruning them in a single stage does not help because
layers are additive — a later `npm prune` leaves the bytes in the earlier layer.
Splitting the stages takes it from 1.99GB to 1.52GB.

Three things the Dockerfile handles that are easy to get wrong:

- **`scripts/` is copied before `npm ci`.** `postinstall` copies the pdf.js
  worker, so the install fails at that layer without it.
- **The TeX cache is warmed at build time** into `/opt/tex-cache`. Tectonic
  downloads ~43MB of support files on first use (~21s); baking it in means no
  user waits for that, and a restart does not lose it. `/tmp` would.
- **Tectonic is pinned to 0.17.0.** The layout limits were measured against this
  engine; a silent upgrade could change line breaking and therefore the page
  budget.

Measured in the built image, running as the non-root `node` user: **552ms** to
compile the bundled template to a 33KB single-page PDF, and Next boots in 161ms.

`railway.toml` and `render.yaml` are included; each host reads only its own file.
Both health-check `/terms`, which is static and touches neither Neon nor a
session, so the check reports on the app rather than on its dependencies.

Set every variable from `.env.example` in the host's dashboard, plus:

- `AUTH_URL` and `NEXT_PUBLIC_APP_URL` — the real origin
- `BYOK_ENCRYPTION_KEY` — a dedicated secret, so rotating `AUTH_SECRET` does not
  invalidate users' stored API keys
- `UPSTASH_REDIS_REST_URL` / `_TOKEN` — `/api/generate` is the one route that
  costs money per call, and runs unthrottled without them

Register `https://your-domain/api/auth/callback/google` with the Google OAuth
client, and run migrations from a laptop against the production database
(`npm run db:migrate`) — build-only dependencies including drizzle-kit are pruned
from the runtime image.

## Credits

The resume template is [Jake's Resume](https://github.com/jakegut/resume) by
Jake Gutierrez, MIT licensed, based in turn on
[sb2nov/resume](https://github.com/sb2nov/resume). It is bundled as
`lib/templates/jake.tex` with the pdfTeX-only lines guarded so it compiles on
more engines.
