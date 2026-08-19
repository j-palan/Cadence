import { and, desc, eq, sql } from 'drizzle-orm'

import { db } from './index'
import { logImports, resumes, users } from './schema'
import type { LogImport, Resume, User } from './schema'

/**
 * The app's entire data-access surface.
 *
 * Two rules hold for every function in this file:
 *
 *   1. `userId` is the first parameter, and it comes from the server session
 *      (`await auth()`) — never from a request body, query param, or any other
 *      client-supplied value.
 *   2. Ownership lives in the `where` clause. A fetch-then-compare check leaks
 *      row existence through timing and is easy to forget on a new query.
 *
 * Functions that target a single row return `null` when the row does not exist
 * *or* is not the caller's. The two cases are deliberately indistinguishable —
 * callers turn `null` into a 404.
 */

// ---- Users ----

export async function getUser(userId: string): Promise<User | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  return row ?? null
}

export async function setUserAgents(userId: string, agents: string[]): Promise<User | null> {
  const [row] = await db
    .update(users)
    .set({ agents })
    .where(eq(users.id, userId))
    .returning()
  return row ?? null
}

export async function completeOnboarding(userId: string, agents: string[]): Promise<User | null> {
  const [row] = await db
    .update(users)
    .set({ agents, onboarded: true })
    .where(eq(users.id, userId))
    .returning()
  return row ?? null
}

/** Cascades to accounts, sessions, resumes, and log_imports via FK constraints. */
export async function deleteUser(userId: string): Promise<boolean> {
  const rows = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id })
  return rows.length > 0
}

// ---- Resumes ----

export async function listResumes(userId: string): Promise<Resume[]> {
  return db
    .select()
    .from(resumes)
    .where(eq(resumes.userId, userId))
    .orderBy(desc(resumes.updatedAt))
}

export async function getResume(userId: string, id: string): Promise<Resume | null> {
  const [row] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .limit(1)
  return row ?? null
}

export async function createResume(
  userId: string,
  input: { name?: string; template: string; latexSource: string },
): Promise<Resume> {
  const [row] = await db
    .insert(resumes)
    .values({
      userId,
      name: input.name ?? 'My Resume',
      template: input.template,
      latexSource: input.latexSource,
    })
    .returning()
  return row
}

export async function updateResumeSource(
  userId: string,
  id: string,
  latexSource: string,
): Promise<Resume | null> {
  const [row] = await db
    .update(resumes)
    .set({ latexSource, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning()
  return row ?? null
}

export async function updateResume(
  userId: string,
  id: string,
  patch: { name?: string; latexSource?: string; template?: string },
): Promise<Resume | null> {
  const [row] = await db
    .update(resumes)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteResume(userId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
    .returning({ id: resumes.id })
  return rows.length > 0
}

export async function countResumes(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(resumes)
    .where(eq(resumes.userId, userId))
  return row?.count ?? 0
}

// ---- Log imports ----

export async function createLogImport(
  userId: string,
  input: { resumeId: string | null; rawContent: string },
): Promise<LogImport> {
  const [row] = await db
    .insert(logImports)
    .values({
      userId,
      resumeId: input.resumeId,
      rawContent: input.rawContent,
    })
    .returning()
  return row
}

/** The most recent log a user imported for a resume — powers "Regenerate from log". */
export async function getLatestLogImport(
  userId: string,
  resumeId: string,
): Promise<LogImport | null> {
  const [row] = await db
    .select()
    .from(logImports)
    .where(and(eq(logImports.userId, userId), eq(logImports.resumeId, resumeId)))
    .orderBy(desc(logImports.importedAt))
    .limit(1)
  return row ?? null
}
