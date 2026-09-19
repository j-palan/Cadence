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
**a LaTeX engine** are required to boot. Users can add their own AI provider key
during onboarding when they want generation; the editor and PDF compiler work
without one.

---

## Prerequisites

| Requirement | Why | Notes |
|---|---|---|
| **Node 20+** | Next.js 14 | Built and tested on Node 22 |
| **A LaTeX engine** | Compiling resumes to PDF | `brew install tectonic` — one ~30MB binary that downloads only the packages a document uses. An existing TeX Live / MacTeX install works too; Cadence falls back to `pdflatex`. |
| **A Postgres database** | Users, resumes, logs | A free [Neon](https://neon.tech) project is the path of least resistance — it is serverless, so there is nothing to run locally. |
| **A user-supplied AI API key** | Generating, updating, or tailoring a resume | Optional. Onboarding supports Gemini, Anthropic, OpenAI, and providers with an OpenAI-compatible Chat Completions API. Without a key, editing and PDF export still work. |

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

There is no shared model key to configure. Each user can add a provider key
during onboarding or under Settings → **Model**.

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

## Connecting an AI model

Cadence has no shared API key. During onboarding or under Settings → **Model**,
a user can connect Gemini, Anthropic, OpenAI, or another provider that implements
the streaming OpenAI Chat Completions format. A key can be switched off without
discarding it, or removed entirely. AI generation stays disabled until the user
has an enabled, verified key.

How keys are handled:

- **Verified before storage.** Saving makes a minimal real call to the provider,
  so a typo or a wrong model is caught while the field is still on screen.
- **Encrypted at rest** with AES-256-GCM and a per-record IV, keyed by HKDF from
  `BYOK_ENCRYPTION_KEY` (falling back to `AUTH_SECRET`). Tampering fails closed.
- **Never returned to the browser.** The client only ever receives the last four
  characters. `getAiSettingsForClient` is the only reader a page may call;
  `getAiCredentials` returns ciphertext and is server-only.
- **Never silently redirected.** A request only runs the provider and model the
  user selected. Retries use that same model.

## Using it

1. **Onboarding** picks your agents, hands you the snippet for each, and optionally
   connects your AI provider. Paste each snippet
   into the config file shown (`~/.claude/CLAUDE.md`, `.cursor/rules/`,
   `.github/copilot-instructions.md`, …). Claude Code, Cursor, Copilot,
   Windsurf, Cline, and Aider are covered.
2. **Go code.** Your agent appends to `~/cadence-log.md` as you ship.
3. **New resume** → paste the log (or open the file directly, in Chromium) →
   *Generate from log*. Your chosen model drafts the LaTeX, streaming as it goes. Or
   *Skip — edit the template myself* to go straight to Jake's Resume.
4. **The editor** autosaves 1.5s after you stop typing and recompiles shortly
   after. `⌘S` does both immediately. Compiler errors arrive with line numbers,
   and the full TeX log is one click away. *PDF* downloads what the engine
   produced.

## Demo recording inputs

These fictional inputs are written for the Jake Ryan resume bundled with
Cadence. They tell one consistent story, so you can record the create, update,
tailor, and AI chat flows without preparing separate examples.

### Work log

Paste this into **Create from log**:

```markdown
# Resume log
Last updated: June 12, 2021

## Skills & Technologies
- Languages: Java, Python, C/C++, SQL, JavaScript, HTML/CSS, R
- Frameworks: React, Node.js, Flask, FastAPI, JUnit, Material-UI
- Data and infrastructure: PostgreSQL, Redis, Celery, Docker, Google Cloud Platform
- Tools: Git, Maven, Travis CI
- Libraries: pandas, NumPy, Matplotlib

## Texas A&M University — Undergraduate Research Assistant
- Built a FastAPI and PostgreSQL REST API that stores data imported from learning management systems.
- Developed a full-stack Flask and React application for analyzing collaboration across GitHub repositories.
- Containerized the application with Docker and created visualizations for classroom GitHub activity.

## Southwestern University — IT Support Specialist
- Diagnosed hardware and software issues for students, faculty, and staff.
- Set up and maintained campus computers, classroom equipment, and 200 printers.
- Coordinated computer deployments with campus managers.

## Southwestern University — Artificial Intelligence Research Assistant
- Researched procedural generation methods for video game dungeons inspired by The Legend of Zelda.
- Built a Java game for evaluating generated dungeons and contributed more than 50,000 lines of code through Git.
- Conducted a human-subject study, wrote an eight-page paper, and presented the research at the World Conference on Computational Intelligence.

## Gitlytics
- Built a full-stack analytics application with a Flask REST API, React, and PostgreSQL.
- Implemented GitHub OAuth to import repository data.
- Used Celery and Redis to process analysis jobs asynchronously.
- Visualized repository activity to help instructors understand student collaboration.

## Simple Paintball
- Developed a Java Minecraft server plugin with the Spigot API and Maven.
- Reached more than 2,000 downloads and maintained an average 4.5/5 rating.
- Automated release builds with Travis CI and used administrator feedback to prioritize features.
```

### Updated work log

Paste this into **Update from log** after generating the first resume. It adds a
new job plus three new accomplishments, while the remaining context helps the
model update the correct entries without rewriting unrelated sections.

```markdown
# Resume log
Last updated: August 20, 2021

## Skills & Technologies
- Languages: Java, Python, C/C++, SQL, JavaScript, HTML/CSS, R
- Frameworks: React, Node.js, Flask, FastAPI, JUnit, Material-UI
- Data and infrastructure: PostgreSQL, Redis, Celery, Docker, Google Cloud Platform
- Tools: Git, Maven, Travis CI
- Libraries: pandas, NumPy, Matplotlib

## New experience — add this role to the resume
### Pinecone Learning Labs — Software Engineering Intern
Austin, TX | May 2021 -- August 2021
- Built a React analytics dashboard used by 12 instructors to review student participation across 30 courses.
- Developed FastAPI and PostgreSQL endpoints for course activity data, reducing dashboard load time by 42%.
- Containerized the application with Docker and added Travis CI checks for every pull request.
- Worked with instructors to turn weekly feedback into product improvements and bug fixes.

## New accomplishments
- Added background processing to Gitlytics with Celery and Redis, cutting large repository import time from 90 seconds to 24 seconds.
- Added PostgreSQL indexes and pagination to the research API, reducing median response time by 38% on the classroom dataset.
- Created troubleshooting documentation for the campus help desk that reduced repeat printer tickets by 20% during the fall rollout.

## Existing context
- Gitlytics is a Flask, React, and PostgreSQL application that imports repository data through GitHub OAuth.
- The Texas A&M research API uses FastAPI and PostgreSQL for learning-management-system data.
- The Southwestern IT role supports campus computers, classroom equipment, and 200 printers.
```

### Job posting

Paste this into **Tailor to a job**:

```text
Software Engineer — University Products
CampusLoop | Austin, TX | Full-time

CampusLoop builds collaboration and analytics tools used by instructors and
students. We are looking for an early-career software engineer who enjoys
working across a React frontend and Python services.

What you will do
- Build accessible product features with React and JavaScript.
- Design and maintain Python REST APIs using Flask or FastAPI.
- Model and query application data in PostgreSQL.
- Develop background jobs for data imports and analysis.
- Integrate third-party services using OAuth and documented APIs.
- Use Git, automated tests, continuous integration, and code review to ship
  reliable changes.
- Work with instructors and support teams to turn feedback into improvements.

What we are looking for
- Experience building full-stack web applications.
- Working knowledge of Python, JavaScript, SQL, React, and PostgreSQL.
- Familiarity with Docker and cloud deployment.
- Clear written communication and a collaborative approach to debugging.

Nice to have
- Celery or Redis experience.
- Experience with GitHub data or education technology.
- Experience creating analytics or data visualizations.
```

### AI chat edit

Open **Edit with AI** and send:

```text
Make the Gitlytics project the strongest match for a full-stack software
engineering role. Lead with the measurable import-time improvement, emphasize
React, Flask, PostgreSQL, GitHub OAuth, Celery, and Redis, and keep it to three
concise bullets. Do not add any skills or results that are not already in the
resume.
```

For a second short interaction, send:

```text
Move Technical Skills directly below Education and put the technologies from
the CampusLoop posting first within each existing skills list. Keep every
technology already listed.
```

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
    onboarding/          Agent setup and optional AI-provider wizard
    dashboard/           Resume cards
    resume/new/          Log import → generate
    resume/[id]/         The LaTeX editor
    settings/            Account, agent snippets, deletion
  api/
    auth/[...nextauth]/  Auth.js handlers (Google redirect + callback)
    generate/            POST: log → chosen model → LaTeX (streamed); 3 modes
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
    engine.ts            Resolves the user's verified provider credentials
    providers.ts         Streaming interface over Gemini, Anthropic, OpenAI, and compatible APIs
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
