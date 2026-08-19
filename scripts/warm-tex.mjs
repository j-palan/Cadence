#!/usr/bin/env node
/**
 * Prime the TeX package cache by compiling the bundled template once.
 *
 * Tectonic downloads the support files a document needs on first use. Without
 * this, the first person to hit the editor waits ~20s; after it, compiles are
 * around half a second. Safe to re-run — an already-warm cache is a no-op.
 *
 * Keep the cache path and engine resolution in step with lib/latex.ts.
 */
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, copyFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const CACHE_ROOT = process.env.CADENCE_TEX_CACHE ?? join(tmpdir(), 'cadence-tex-cache')
const TECTONIC = process.env.TECTONIC_PATH ?? 'tectonic'
const TEMPLATE = join(process.cwd(), 'lib', 'templates', 'jake.tex')

const job = await mkdtemp(join(tmpdir(), 'cadence-warm-'))

try {
  await mkdir(CACHE_ROOT, { recursive: true })
  await copyFile(TEMPLATE, join(job, 'resume.tex'))

  console.log(`Warming TeX cache at ${CACHE_ROOT} …`)
  const startedAt = Date.now()

  await run(
    TECTONIC,
    ['--untrusted', '--outfmt', 'pdf', '--reruns', '1', '--outdir', job, join(job, 'resume.tex')],
    {
      cwd: job,
      timeout: 300_000,
      maxBuffer: 8 * 1024 * 1024,
      env: {
        PATH: process.env.PATH ?? '',
        HOME: CACHE_ROOT,
        TMPDIR: job,
        XDG_CACHE_HOME: CACHE_ROOT,
        TECTONIC_CACHE_DIR: join(CACHE_ROOT, 'tectonic'),
        SOURCE_DATE_EPOCH: '0',
      },
    },
  )

  console.log(`Cache warm in ${((Date.now() - startedAt) / 1000).toFixed(1)}s.`)
} catch (error) {
  if (error?.code === 'ENOENT') {
    console.error(
      'No `tectonic` on PATH. Install it with `brew install tectonic`, or set TECTONIC_PATH.',
    )
    process.exit(1)
  }
  console.error(error?.stderr || error?.message || error)
  process.exit(1)
} finally {
  await rm(job, { recursive: true, force: true }).catch(() => {})
}
