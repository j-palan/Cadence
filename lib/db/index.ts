import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

/**
 * `next build` imports every route module to collect page data, so anything
 * that throws at import time fails the build — which turned a missing
 * DATABASE_URL into "Failed to collect page data" rather than a useful message.
 *
 * A build never runs a query, so during that phase a placeholder is enough to
 * construct the client. At runtime a missing URL still fails immediately, and
 * says which variable is missing.
 *
 * The client must be a real Drizzle instance rather than a lazy proxy: the
 * Auth.js Drizzle adapter introspects it to detect the SQL dialect, and rejects
 * anything it cannot recognise ("Unsupported database type (object)").
 */
const BUILD_PLACEHOLDER = 'postgresql://build:build@localhost:5432/build'

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (url) return url

  if (process.env.NEXT_PHASE === 'phase-production-build') return BUILD_PLACEHOLDER

  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon pooled connection string.',
  )
}

/**
 * The Drizzle instance.
 *
 * Do not import this outside `lib/db/`. There is no row-level security behind
 * it: a query missing its `where userId` clause returns every user's rows and
 * the database will serve it happily. All data access goes through
 * `lib/db/queries.ts`, where ownership is part of the function signature.
 * An ESLint rule enforces this.
 */
export const db = drizzle(neon(connectionString()), { schema })

export { schema }
