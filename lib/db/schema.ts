import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import type { AdapterAccount } from 'next-auth/adapters'

// ---- Auth.js adapter tables ----
//
// The Drizzle adapter owns the shape of these four tables. `users` carries the
// app's own columns too, which is why there is no separate `profiles` table.

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),

  // App-specific columns.
  onboarded: boolean('onboarded').notNull().default(false),
  agents: text('agents').array().notNull().default([]),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const accounts = pgTable(
  'accounts',
  {
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').$type<AdapterAccount['type']>().notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('providerAccountId').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
    userIdx: index('accounts_user_id_idx').on(t.userId),
  }),
)

export const sessions = pgTable(
  'sessions',
  {
    sessionToken: text('sessionToken').primaryKey(),
    userId: text('userId')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => ({
    userIdx: index('sessions_user_id_idx').on(t.userId),
  }),
)

export const verificationTokens = pgTable(
  'verificationTokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  }),
)

// ---- App tables ----

export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull().default('My Resume'),
    latexSource: text('latex_source').notNull().default(''),
    template: text('template').notNull().default('jake'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => ({
    // Every resume query filters on userId, so it carries an index.
    userIdx: index('resumes_user_id_idx').on(t.userId),
  }),
)

export const logImports = pgTable(
  'log_imports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id').references(() => resumes.id, { onDelete: 'set null' }),
    rawContent: text('raw_content').notNull(),
    importedAt: timestamp('imported_at').notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('log_imports_user_id_idx').on(t.userId),
  }),
)

export type User = typeof users.$inferSelect
export type Resume = typeof resumes.$inferSelect
export type LogImport = typeof logImports.$inferSelect
