import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })
config({ path: '.env' })

// Migrations run over a direct (unpooled) connection. PgBouncer in transaction
// mode cannot handle the session-level statements drizzle-kit issues.
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL

if (!url) {
  throw new Error(
    'DATABASE_URL_UNPOOLED (or DATABASE_URL) must be set. Copy .env.example to .env.local and fill it in.',
  )
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
})
