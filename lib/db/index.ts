import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'

import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon pooled connection string.',
  )
}

const sql = neon(connectionString)

/**
 * The Drizzle instance.
 *
 * Do not import this outside `lib/db/`. There is no row-level security behind
 * it: a query missing its `where userId` clause returns every user's rows and
 * the database will serve it happily. All data access goes through
 * `lib/db/queries.ts`, where ownership is part of the function signature.
 * An ESLint rule enforces this.
 */
export const db = drizzle(sql, { schema })

export { schema }
