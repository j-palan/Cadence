import 'server-only'

import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { LatexError } from './latex-client'

/**
 * LaTeX → PDF, the way Overleaf does it: run a real TeX engine over the source.
 *
 * Tectonic is preferred — one binary, and it fetches only the packages a
 * document actually uses instead of needing a full TeX Live install. pdflatex is
 * accepted as a fallback for machines that already have TeX Live or MacTeX.
 *
 * Compiling user-supplied LaTeX is the sharp edge here. TeX is a programming
 * language: `\write18` can execute shell commands and `\input` can read
 * arbitrary files. Three things contain that:
 *
 *   1. Shell escape is off (`--untrusted` / `-no-shell-escape`).
 *   2. `openin_any=p` / `openout_any=p` confine file reads and writes to the
 *      temp directory the job runs in.
 *   3. A wall-clock timeout kills runaway macro expansion, and the temp
 *      directory is removed no matter how the run ends.
 */

// Generous, because the *first* compile on a cold cache spends most of its time
// downloading support files (~20s observed). Warm compiles land near 500ms.
// `npm run tex:warm` primes the cache so no user pays that cost.
export const COMPILE_TIMEOUT_MS = 60_000
export const MAX_SOURCE_CHARS = 400_000

/** Two passes, so `\section` rules and any cross-references settle. */
const PASSES = 2

export type Engine = 'tectonic' | 'pdflatex'

/**
 * Engines are tried in order. The binary name can be overridden per engine for
 * machines where TeX is installed somewhere off PATH.
 */
const ENGINE_BINARIES: Record<Engine, string> = {
  tectonic: process.env.TECTONIC_PATH ?? 'tectonic',
  pdflatex: process.env.PDFLATEX_PATH ?? 'pdflatex',
}

export class EngineNotFoundError extends Error {
  constructor() {
    super(
      'No LaTeX engine was found. Install Tectonic (`brew install tectonic`) or a TeX distribution providing pdflatex, then restart the dev server.',
    )
    this.name = 'EngineNotFoundError'
  }
}

export interface CompileSuccess {
  ok: true
  pdf: Buffer
  log: string
  engine: Engine
  durationMs: number
}

export interface CompileFailure {
  ok: false
  log: string
  errors: LatexError[]
  engine: Engine
  durationMs: number
}

export type CompileResult = CompileSuccess | CompileFailure

export type { LatexError }

interface RunResult {
  code: number
  stdout: string
  stderr: string
  spawnFailed: boolean
}

/**
 * Where the engine keeps its package cache, shared across every compile.
 *
 * This must NOT live in the per-job temp directory: Tectonic downloads the
 * support files a document needs on first use, and a fresh cache per request
 * would re-download the whole set every single compile (tens of seconds each).
 * The first compile after a deploy is slow; every one after it is warm.
 */
const CACHE_ROOT = process.env.CADENCE_TEX_CACHE ?? join(tmpdir(), 'cadence-tex-cache')

let cacheReady: Promise<void> | null = null

function ensureCache(): Promise<void> {
  cacheReady ??= mkdir(CACHE_ROOT, { recursive: true }).then(() => undefined)
  return cacheReady
}

function run(
  file: string,
  args: string[],
  options: { cwd: string; timeout: number },
): Promise<RunResult> {
  // A deliberately bare environment: only what an engine needs.
  //
  // The job's own working directory is still the temp dir, and openin_any /
  // openout_any keep kpathsea (pdflatex) from reading or writing outside it.
  // Only the package cache is shared, and only the engine writes there.
  //
  // The cast is needed because Next widens ProcessEnv to require NODE_ENV.
  const env = {
    PATH: process.env.PATH ?? '',
    HOME: CACHE_ROOT,
    TMPDIR: options.cwd,
    XDG_CACHE_HOME: CACHE_ROOT,
    TECTONIC_CACHE_DIR: join(CACHE_ROOT, 'tectonic'),
    TEXMFHOME: join(CACHE_ROOT, 'texmf'),
    TEXMFVAR: join(CACHE_ROOT, 'texmf-var'),
    TEXMFCONFIG: join(CACHE_ROOT, 'texmf-config'),
    openin_any: 'p',
    openout_any: 'p',
    shell_escape: 'f',
    SOURCE_DATE_EPOCH: '0',
  } as unknown as NodeJS.ProcessEnv

  return new Promise((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd: options.cwd,
        timeout: options.timeout,
        maxBuffer: 8 * 1024 * 1024,
        encoding: 'utf8',
        env,
      },
      (error, stdout, stderr) => {
        if (error?.code === 'ENOENT') {
          resolve({ code: -1, stdout: '', stderr: '', spawnFailed: true })
          return
        }

        if (error?.killed) {
          reject(
            new Error(
              `Compilation timed out after ${Math.round(options.timeout / 1000)}s. Check for an unterminated environment or a runaway macro.`,
            ),
          )
          return
        }

        // A non-zero exit is normal for LaTeX errors — the log is the real
        // signal, so resolve rather than reject and let the caller read it.
        resolve({
          code: typeof error?.code === 'number' ? error.code : 0,
          stdout,
          stderr,
          spawnFailed: false,
        })
      },
    )
  })
}

function argsFor(engine: Engine, texPath: string, cwd: string): string[] {
  if (engine === 'tectonic') {
    return [
      '--untrusted',
      '--outfmt',
      'pdf',
      '--keep-logs',
      '--reruns',
      String(PASSES - 1),
      '--outdir',
      cwd,
      texPath,
    ]
  }

  return [
    '-interaction=nonstopmode',
    '-halt-on-error',
    '-no-shell-escape',
    '-file-line-error',
    `-output-directory=${cwd}`,
    texPath,
  ]
}

/**
 * Pull human-readable errors out of a TeX log.
 *
 * Both engines emit `file:line: message` when `-file-line-error` is on, and
 * plain `! message` otherwise. This covers both rather than trying to be a
 * complete log parser.
 */
export function parseLatexLog(log: string): LatexError[] {
  const errors: LatexError[] = []
  const seen = new Set<string>()

  const patterns = [
    /^(?:[^\s:]+):(\d+):\s*(.+)$/gm, // file:line: message
    /^!\s+(.+)$/gm, // ! message
    /^error:\s*(.+)$/gim, // tectonic's own diagnostics
  ]

  for (const [index, pattern] of patterns.entries()) {
    for (const match of log.matchAll(pattern)) {
      const line = index === 0 ? Number.parseInt(match[1], 10) : null
      const message = (index === 0 ? match[2] : match[1]).trim()

      if (!message || message.startsWith('==>')) continue

      const key = `${line}:${message}`
      if (seen.has(key)) continue
      seen.add(key)

      errors.push({ line: Number.isFinite(line) ? line : null, message })
    }
  }

  return errors.slice(0, 25)
}

async function readIfPresent(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return ''
  }
}

export async function compileLatex(source: string): Promise<CompileResult> {
  if (source.length > MAX_SOURCE_CHARS) {
    throw new Error('This document is too large to compile.')
  }

  await ensureCache()

  const dir = await mkdtemp(join(tmpdir(), 'cadence-tex-'))
  const texPath = join(dir, 'resume.tex')
  const pdfPath = join(dir, 'resume.pdf')
  const logPath = join(dir, 'resume.log')
  const startedAt = Date.now()

  try {
    await writeFile(texPath, source, 'utf8')

    let engine: Engine | null = null
    let output = ''

    for (const candidate of ['tectonic', 'pdflatex'] as const) {
      // Tectonic reruns internally; pdflatex needs the passes driven here.
      const passes = candidate === 'tectonic' ? 1 : PASSES
      let spawnFailed = false

      for (let pass = 0; pass < passes; pass += 1) {
        const result = await run(
          ENGINE_BINARIES[candidate],
          argsFor(candidate, texPath, dir),
          { cwd: dir, timeout: COMPILE_TIMEOUT_MS },
        )

        if (result.spawnFailed) {
          spawnFailed = true
          break
        }

        output = `${result.stdout}\n${result.stderr}`
      }

      if (!spawnFailed) {
        engine = candidate
        break
      }
    }

    if (!engine) throw new EngineNotFoundError()

    const log = [await readIfPresent(logPath), output].filter(Boolean).join('\n').trim()
    const durationMs = Date.now() - startedAt

    let pdf: Buffer | null = null
    try {
      pdf = await readFile(pdfPath)
    } catch {
      pdf = null
    }

    // An empty PDF means the engine bailed even if it exited zero.
    if (!pdf || pdf.byteLength === 0) {
      return { ok: false, log, errors: parseLatexLog(log), engine, durationMs }
    }

    return { ok: true, pdf, log, engine, durationMs }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
