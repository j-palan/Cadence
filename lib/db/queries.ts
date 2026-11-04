import { and, desc, eq, sql, gt } from 'drizzle-orm'

import { db } from './index'
import { logImports, resumes, users, jobs, jobSources, savedJobs, jobApplications } from './schema'
import type { LogImport, Resume, User } from './schema'

export class DuplicateResumeNameError extends Error {
  constructor() {
    super('A resume with this name already exists.')
    this.name = 'DuplicateResumeNameError'
  }
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current && typeof current === 'object'; depth += 1) {
    if ('code' in current && current.code === '23505') return true
    current = 'cause' in current ? current.cause : null
  }
  return false
}

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

/**
 * The user's own-model configuration, including the encrypted key.
 *
 * Returns the ciphertext, so callers are server-side only. Nothing here may be
 * handed to a client component — see `getAiSettingsForClient`.
 */
export async function getAiCredentials(userId: string): Promise<{
  enabled: boolean
  provider: string | null
  baseUrl: string | null
  model: string | null
  keyCipher: string | null
} | null> {
  const [row] = await db
    .select({
      enabled: users.byokEnabled,
      provider: users.byokProvider,
      model: users.byokModel,
      baseUrl: users.byokBaseUrl,
      keyCipher: users.byokKeyCipher,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row ?? null
}

/** Safe to serialise to the browser: no ciphertext, only the last four chars. */
export async function getAiSettingsForClient(userId: string): Promise<{
  enabled: boolean
  provider: string | null
  baseUrl: string | null
  model: string | null
  keyHint: string | null
  verifiedAt: Date | null
} | null> {
  const [row] = await db
    .select({
      enabled: users.byokEnabled,
      provider: users.byokProvider,
      model: users.byokModel,
      baseUrl: users.byokBaseUrl,
      keyHint: users.byokKeyHint,
      verifiedAt: users.byokVerifiedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row ?? null
}

export async function saveAiCredentials(
  userId: string,
  input: {
    provider: string
    model: string
    baseUrl: string | null
    keyCipher: string
    keyHint: string
  },
): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      byokEnabled: true,
      byokProvider: input.provider,
      byokModel: input.model,
      byokBaseUrl: input.baseUrl,
      byokKeyCipher: input.keyCipher,
      byokKeyHint: input.keyHint,
      byokVerifiedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return rows.length > 0
}

/** Turning it off keeps the key, so it can be switched back on without re-entry. */
export async function setAiEnabled(userId: string, enabled: boolean): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({ byokEnabled: enabled })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return rows.length > 0
}

/** Switch model within the provider the stored key belongs to. */
export async function setAiModel(userId: string, model: string): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({ byokModel: model })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return rows.length > 0
}

export async function clearAiCredentials(userId: string): Promise<boolean> {
  const rows = await db
    .update(users)
    .set({
      byokEnabled: false,
      byokProvider: null,
      byokModel: null,
      byokBaseUrl: null,
      byokKeyCipher: null,
      byokKeyHint: null,
      byokVerifiedAt: null,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id })
  return rows.length > 0
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
  try {
    const [row] = await db
      .insert(resumes)
      .values({
        userId,
        name: input.name?.trim() || 'My Resume',
        template: input.template,
        latexSource: input.latexSource,
      })
      .returning()
    return row
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateResumeNameError()
    throw error
  }
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
  try {
    const normalizedPatch = patch.name === undefined ? patch : { ...patch, name: patch.name.trim() }
    const [row] = await db
      .update(resumes)
      .set({ ...normalizedPatch, updatedAt: new Date() })
      .where(and(eq(resumes.id, id), eq(resumes.userId, userId)))
      .returning()
    return row ?? null
  } catch (error) {
    if (isUniqueViolation(error)) throw new DuplicateResumeNameError()
    throw error
  }
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

// ---- Jobs ----
// Jobs/source status are explicitly public, shared data. `null` is the system
// principal for the authenticated scheduler; it can only access public feeds.
// Every function that reads/writes private bookmarks still requires a userId.
export async function claimJobSource(_principal: null, sourceId: string, refreshMs: number) {
  const now = new Date()
  const [row] = await db.insert(jobSources).values({ id: sourceId, attemptedAt: now, leaseUntil: new Date(now.getTime() + 120000) })
    .onConflictDoUpdate({ target: jobSources.id,
      set: { attemptedAt: now, leaseUntil: new Date(now.getTime() + 120000) },
      setWhere: sql`${jobSources.leaseUntil} < ${now} AND ${jobSources.attemptedAt} < ${new Date(now.getTime() - 15 * 60000)} AND (${jobSources.checkedAt} IS NULL OR ${jobSources.checkedAt} < ${new Date(now.getTime() - refreshMs)})`,
    }).returning()
  return row ?? null
}
export async function finishJobSource(_principal: null, sourceId: string, checkedAt: Date, postings: (typeof jobs.$inferInsert)[]) {
  // A single transaction publishes the complete snapshot, including an empty
  // successful feed. Failures never close listings. The source lease prevents
  // overlapping refreshes of the same employer.
  const reset = db.update(jobs).set({ active: false }).where(eq(jobs.sourceId, sourceId))
  const finish = db.update(jobSources).set({ checkedAt, error: null, leaseUntil: checkedAt }).where(eq(jobSources.id, sourceId))
  if (!postings.length) { await db.batch([reset, finish]); return }
  await db.batch([reset, db.insert(jobs).values(postings).onConflictDoUpdate({ target: jobs.id, set: {
    title: sql`excluded.title`, location: sql`excluded.location`, countries: sql`excluded.countries`,
    remote: sql`excluded.remote`, term: sql`excluded.term`, description: sql`excluded.description`,
    url: sql`excluded.url`, checkedAt, active: true,
  } }), finish])
}
export async function failJobSource(_principal: null, sourceId: string) {
  await db.update(jobSources).set({ error: 'Employer feed unavailable. Will retry.', leaseUntil: new Date() }).where(eq(jobSources.id, sourceId))
}
export async function listJobSources(_principal: string | null) {
  return db.select().from(jobSources)
}
export async function listJobs(userId: string) {
  // Include closed/stale saved roles so they do not disappear from a user's list.
  const fresh = new Date(Date.now() - 48 * 3600000)
  return db.select({ job: jobs, savedAt: savedJobs.createdAt, application: jobApplications }).from(jobs)
    .leftJoin(savedJobs, and(eq(savedJobs.jobId, jobs.id), eq(savedJobs.userId, userId)))
    .leftJoin(jobApplications, and(eq(jobApplications.jobId, jobs.id), eq(jobApplications.userId, userId)))
    .where(sql`(${jobs.active} = true AND ${jobs.checkedAt} > ${fresh}) OR ${savedJobs.userId} = ${userId} OR ${jobApplications.userId} = ${userId}`)
    .orderBy(desc(jobs.firstSeenAt)).limit(1000)
}
export async function getJob(_userId: string, jobId: string) {
  const [row] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1)
  return row ?? null
}
export async function saveJob(userId: string, jobId: string, saved: boolean) {
  if (!saved) {
    await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)))
    return true
  }
  // Save only listings that are still fresh and open.
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.active, true), gt(jobs.checkedAt, new Date(Date.now() - 48 * 3600000)))).limit(1)
  if (!job) return false
  await db.insert(savedJobs).values({ userId, jobId }).onConflictDoNothing()
  return true
}

/** Create a separate tailored version; never write tailoring into its parent. */
export async function createTailoredResume(userId: string, sourceId: string, latexSource: string, requestedName: string, copyId?: string) {
  const parent = await getResume(userId, sourceId)
  if (!parent) return null
  const base = requestedName.trim().slice(0, 110) || `${parent.name.slice(0, 90)} — tailored`
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const [copy] = await db.insert(resumes).values({ id: copyId, userId, name: attempt ? `${base} (${attempt + 1})` : base, template: parent.template, latexSource })
        .onConflictDoNothing({ target: resumes.id }).returning()
      return copy ?? (copyId ? await getResume(userId, copyId) : null)
    } catch (error) {
      if (!(error instanceof DuplicateResumeNameError) && !isUniqueViolation(error)) throw error
    }
  }
  throw new DuplicateResumeNameError()
}

export async function getJobApplication(userId: string, jobId: string) {
  const [row] = await db.select().from(jobApplications).where(and(eq(jobApplications.userId, userId), eq(jobApplications.jobId, jobId))).limit(1)
  return row ?? null
}

export async function updateJobApplication(userId: string, jobId: string, input: {
  status: 'saved' | 'applied' | 'interviewing' | 'closed'; resumeId: string | null; notes: string
}) {
  if (!await getJob(userId, jobId)) return null
  const selected = input.resumeId ? await getResume(userId, input.resumeId) : null
  if (input.resumeId && !selected) return null
  const existing = await getJobApplication(userId, jobId)
  const submitted = input.status === 'applied' || input.status === 'interviewing'
  // Freeze the first submitted source. Later editor changes cannot rewrite it.
  const snapshot = existing?.submittedSource ?? (submitted ? selected?.latexSource ?? null : null)
  const [row] = await db.insert(jobApplications).values({
    userId, jobId, status: input.status, notes: input.notes, resumeId: selected?.id ?? null,
    resumeName: existing?.submittedSource ? existing.resumeName : selected?.name ?? null,
    submittedSource: snapshot, appliedAt: existing?.appliedAt ?? (submitted ? new Date() : null),
  }).onConflictDoUpdate({ target: [jobApplications.userId, jobApplications.jobId], set: {
    status: input.status, notes: input.notes,
    resumeId: existing?.submittedSource ? existing.resumeId : selected?.id ?? null,
    resumeName: sql`coalesce(case when ${jobApplications.submittedSource} is not null then ${jobApplications.resumeName} end, excluded.resume_name)`,
    submittedSource: sql`coalesce(${jobApplications.submittedSource}, excluded.submitted_source)`,
    appliedAt: sql`coalesce(${jobApplications.appliedAt}, excluded.applied_at)`, updatedAt: new Date(),
  } }).returning()
  return row
}

export async function linkTailoredJobResume(userId: string, jobId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId)
  if (!resume || !await getJob(userId, jobId)) return
  await db.insert(jobApplications).values({ userId, jobId, resumeId, resumeName: resume.name })
    .onConflictDoUpdate({ target: [jobApplications.userId, jobApplications.jobId],
      set: { resumeId, resumeName: resume.name, updatedAt: new Date() },
      setWhere: eq(jobApplications.status, 'saved') })
}
