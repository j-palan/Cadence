#!/usr/bin/env node
/**
 * Copy the pdf.js worker into public/ so it can be served at a stable URL.
 *
 * pdf.js runs its parser in a Web Worker loaded from `GlobalWorkerOptions
 * .workerSrc`. Letting the bundler resolve that path is fragile across Next
 * versions, so the file is copied verbatim and referenced as /pdf.worker.min.mjs.
 * Re-run after upgrading pdfjs-dist — the worker must match the library version.
 */
import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

const require = createRequire(import.meta.url)

const source = join(dirname(require.resolve('pdfjs-dist/package.json')), 'build', 'pdf.worker.min.mjs')
const destination = join(process.cwd(), 'public', 'pdf.worker.min.mjs')

await mkdir(dirname(destination), { recursive: true })
await copyFile(source, destination)

const { version } = require('pdfjs-dist/package.json')
console.log(`pdf.js worker ${version} → public/pdf.worker.min.mjs`)
