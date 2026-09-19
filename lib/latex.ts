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

/** Metric-compatible fonts shipped with TeX for common proprietary desktop fonts. */
const PORTABLE_FONT_FALLBACKS: Record<string, string> = {
  'times new roman': 'TeX Gyre Termes',
  times: 'TeX Gyre Termes',
  arial: 'TeX Gyre Heros',
  'helvetica neue': 'TeX Gyre Heros',
  'courier new': 'TeX Gyre Cursor',
  consolas: 'TeX Gyre Cursor',
  cambria: 'TeX Gyre Pagella',
  georgia: 'TeX Gyre Pagella',
}

function blankExceptNewlines(value: string): string {
  return value.replace(/[^\r\n]/g, ' ')
}

/**
 * Copying LaTeX from a rendered chat or rich-text page can wrap the document in
 * `**` or a Markdown code fence. Ignore only wrapper-shaped text outside a
 * complete document; arbitrary prose and malformed LaTeX still fail normally.
 * Blanking instead of deleting keeps compiler line numbers aligned with the
 * editor.
 */
function removeMarkdownDocumentWrappers(source: string): string {
  const withoutBom = source.replace(/^\uFEFF/, ' ')
  const documentStart = withoutBom.indexOf('\\documentclass')
  if (documentStart < 0) return withoutBom

  let result = withoutBom
  const prefix = result.slice(0, documentStart)
  if (/^[\s*_`]*(?:(?:latex|tex)\s*)?$/i.test(prefix)) {
    result = `${blankExceptNewlines(prefix)}${result.slice(documentStart)}`
  }

  const endMarker = '\\end{document}'
  const documentEnd = result.lastIndexOf(endMarker)
  if (documentEnd >= 0) {
    const suffixStart = documentEnd + endMarker.length
    const suffix = result.slice(suffixStart)
    if (/^[\s*_`]*$/.test(suffix)) {
      result = `${result.slice(0, suffixStart)}${blankExceptNewlines(suffix)}`
    }
  }

  return result
}

/** XeTeX emits Unicode mappings itself; these pdfTeX-only helpers crash it. */
function removePdfTeXUnicodeSetup(source: string): string {
  return source
    .replace(
      /^[ \t]*\\input\s*\{?glyphtounicode(?:\.tex)?\}?[ \t]*$/gim,
      (line) => blankExceptNewlines(line),
    )
    .replace(
      /^[ \t]*\\pdfgentounicode\s*=\s*1[ \t]*$/gim,
      (line) => blankExceptNewlines(line),
    )
}

function portableFontFallbacks(source: string): string {
  function replace(match: string, prefix: string, font: string, suffix: string) {
    const fallback = PORTABLE_FONT_FALLBACKS[font.trim().toLowerCase()]
    return fallback ? `${prefix}${fallback}${suffix}` : match
  }

  return source
    .replace(
      /(\\(?:setmainfont|setsansfont|setmonofont|fontspec)\s*(?:\[[^\]]*\]\s*)?\{)([^{}]+)(\})/gi,
      replace,
    )
    .replace(
      /(\\(?:newfontfamily|newfontface)\s*\\[A-Za-z@]+\s*(?:\[[^\]]*\]\s*)?\{)([^{}]+)(\})/gi,
      replace,
    )
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

  function add(line: number | null, rawMessage: string) {
    const message = friendlyLatexMessage(rawMessage)
    if (!message || message.startsWith('==>')) return
    const key = `${line}:${message}`
    if (seen.has(key)) return
    seen.add(key)
    errors.push({ line: line && Number.isFinite(line) ? line : null, message })
  }

  const lines = log.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index]
    const fileLine = current.match(/^(?:[^\s:]+):(\d+):\s*(.+)$/)
    if (fileLine) {
      add(Number.parseInt(fileLine[1], 10), fileLine[2])
      continue
    }

    const tectonic = current.match(/^error:\s*(.+)$/i)
    if (tectonic) {
      const nearby = lines.slice(index + 1, index + 5).join('\n').match(/(?:resume\.tex:|\bl\.)(\d+)/)
      add(nearby ? Number.parseInt(nearby[1], 10) : null, tectonic[1])
      continue
    }

    const tex = current.match(/^!\s+(.+)$/)
    if (tex) {
      const nearby = lines.slice(index + 1, index + 7).join('\n').match(/^l\.(\d+)/m)
      add(nearby ? Number.parseInt(nearby[1], 10) : null, tex[1])
    }
  }

  return errors.slice(0, 25)
}

function friendlyLatexMessage(message: string): string {
  const normalized = message.trim().replace(/\s+/g, ' ')
  const missingFont = normalized.match(/font\s+["“]?([^"”]+)["”]?\s+cannot be found/i)
  if (missingFont) {
    return `The font “${missingFont[1].trim()}” is not available on the compiler. Choose a TeX font or another portable font.`
  }
  if (/undefined control sequence/i.test(normalized)) {
    return 'Unknown LaTeX command. Check the command name and its leading backslash.'
  }
  if (/runaway argument|file ended while scanning/i.test(normalized)) {
    return 'A command argument is not closed. Check for a missing `}` above this line.'
  }
  if (/missing \} inserted/i.test(normalized)) {
    return 'A closing `}` is missing near this line.'
  }
  if (/extra \}, or forgotten/i.test(normalized)) {
    return 'There is an extra `}` or a command is missing its opening `{`.'
  }
  if (/\begin\{(.+?)\}.*ended by.*\end\{(.+?)\}/i.test(normalized)) {
    return 'A LaTeX environment is closed in the wrong order. Match each `\\begin{…}` with its `\\end{…}`.'
  }
  if (/emergency stop/i.test(normalized)) {
    return 'LaTeX stopped after an earlier error. Fix the first highlighted problem and compile again.'
  }
  return normalized
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
  const compileSource = removeMarkdownDocumentWrappers(source)

  try {
    let engine: Engine | null = null
    let output = ''
    let sourceForEngine = compileSource

    for (const candidate of ['tectonic', 'pdflatex'] as const) {
      sourceForEngine = candidate === 'tectonic'
        ? removePdfTeXUnicodeSetup(compileSource)
        : compileSource
      await writeFile(texPath, sourceForEngine, 'utf8')

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

    let log = [await readIfPresent(logPath), output].filter(Boolean).join('\n').trim()

    // Overleaf projects often name fonts installed on the author's computer or
    // image. If fontspec reports one missing, retry with a TeX-distributed,
    // metric-compatible substitute. The stored source stays exactly as pasted.
    const fallbackSource = portableFontFallbacks(sourceForEngine)
    if (fallbackSource !== sourceForEngine && /font[^\n]+cannot be found/i.test(log)) {
      await Promise.all([
        rm(pdfPath, { force: true }).catch(() => {}),
        rm(logPath, { force: true }).catch(() => {}),
      ])
      await writeFile(texPath, fallbackSource, 'utf8')

      const passes = engine === 'tectonic' ? 1 : PASSES
      output = ''
      for (let pass = 0; pass < passes; pass += 1) {
        const result = await run(
          ENGINE_BINARIES[engine],
          argsFor(engine, texPath, dir),
          { cwd: dir, timeout: COMPILE_TIMEOUT_MS },
        )
        output = `${result.stdout}\n${result.stderr}`
      }
      log = [await readIfPresent(logPath), output].filter(Boolean).join('\n').trim()
    }

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
