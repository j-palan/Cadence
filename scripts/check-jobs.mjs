#!/usr/bin/env node
// Focused, offline regression checks. No database or employer requests.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import ts from 'typescript'

const require = createRequire(import.meta.url)
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const module = { exports: {} }
  const localRequire = name => name in mocks ? mocks[name] : require(name)
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports)
  return module.exports
}
const matching = load('lib/jobs/matching.ts')
const normalize = load('lib/jobs/normalize.ts')
const { filterJobs, groupJobsByCompany } = load('lib/jobs/board.ts', { './normalize': normalize })
const sources = load('lib/jobs/sources.ts')

const profile = matching.extractProfile(String.raw`
\newcommand{\templateMetadata}{Kubernetes Rust}
\begin{document}
\section{Projects}
\resumeItem{Built a React and TypeScript dashboard backed by Python and PostgreSQL.}
\resumeItem{Added C++, C\#, and Java services with unit tests.}
% AWS should not count as evidence.
\href{https://example.com/docker}{Portfolio}
\end{document}`)
assert(profile.skills.includes('C++'))
assert(profile.skills.includes('C#'))
for (const skill of ['Kubernetes', 'Rust', 'Docker', 'AWS', 'C', 'JavaScript']) assert(!profile.skills.includes(skill), `${skill} must not be inferred from metadata, URLs, or a different language`)
const result = matching.matchJob(profile, 'Experience with React, Python, PostgreSQL, and Kubernetes.')
assert.equal(result.score, 75)
assert.deepEqual(result.missing, ['Kubernetes'])
assert.equal(matching.matchJob(profile, 'Bring a collaborative attitude.').score, null)
assert.equal(matching.matchJob(null, 'Python and React').score, null)
assert.equal(matching.matchJob(matching.extractProfile('Python'), 'Python').score, null)
const ordinaryProse = matching.matchJob(profile, 'Spring 2027 interns go above and beyond.')
assert.equal(ordinaryProse.criteria, 0, 'Spring and go in prose are not technical skills')
assert.equal(matching.matchJob(profile, 'Go, C++, and Spring Boot').criteria, 3)
assert.equal(matching.matchJob(profile, 'JavaScript only.').matched.length, 0, 'Java does not imply JavaScript')
assert(result.evidence.every(item => profile.text.includes(item.text)))
const weighted = matching.matchJob(profile, 'Required:\nPython\nPreferred:\nKubernetes')
assert.equal(weighted.score, 75, 'Required skills outweigh preferred skills')
assert.equal(matching.matchJob(profile, 'Required:\nKubernetes\nPreferred:\nPython').score, 25)
const eligibility = matching.matchJob(profile, 'Required:\nPython\nMust graduate in 2027.\nVisa sponsorship is unavailable.\nAvailable for a 12-week internship.')
assert.equal(eligibility.score, 100, 'Eligibility must not silently alter technical fit')
assert(eligibility.eligibility.graduation[0].includes('2027'))
assert(eligibility.eligibility.authorization[0].includes('Visa'))
assert(eligibility.eligibility.availability.length > 0)

assert(normalize.isSweIntern('Software Engineering Intern, Summer 2027'))
assert(normalize.isSweIntern('Backend Developer Co-op'))
assert(!normalize.isSweIntern('Software Engineer, Full Time'))
assert(!normalize.isSweIntern('Senior Software Engineer, Intern Platform'))
assert(!normalize.isSweIntern('Product Design Intern'))
assert.deepEqual(normalize.countriesFor('Toronto, ON, Canada'), ['CA'])
assert.deepEqual(normalize.countriesFor('San Francisco, CA'), ['US'])
assert.deepEqual(normalize.countriesFor('London, United Kingdom'), [])
assert.deepEqual(normalize.countriesFor('Remote'), [], 'Geographically unspecified remote jobs are excluded')
assert.equal(normalize.internshipTerm('Software Intern (Summer 2027)'), 'Summer 2027')
assert.deepEqual(normalize.internshipTerms('Winter 2027'), ['Winter'])
assert.deepEqual(normalize.internshipTerms('Spring 2027'), ['Winter'])
assert.deepEqual(normalize.internshipTerms('Summer or Winter'), ['Winter', 'Summer'])
assert.deepEqual(normalize.internshipTerms('January – April'), ['Winter'])
assert.deepEqual(normalize.internshipTerms('May to August'), ['Summer'])
assert.deepEqual(normalize.internshipTerms('September through December'), ['Fall'])
assert.deepEqual(normalize.internshipTerms('March–June'), ['Winter', 'Summer'])
assert.deepEqual(normalize.internshipTerms('January–December'), ['Winter', 'Summer', 'Fall'])
assert.deepEqual(normalize.internshipTerms('September–April'), ['Winter', 'Fall'])
assert.deepEqual(normalize.jobTerms({ title: 'Software Intern', term: '2027', description: 'The internship runs from May to August.' }), ['Summer'])
assert.deepEqual(normalize.jobTerms({ title: 'Software Intern', term: '2027', description: 'Our company was founded in September.' }), [])
assert.equal(normalize.safeJobUrl('javascript:alert(1)'), null)
assert.equal(normalize.safeJobUrl('http://jobs.example.com'), null)
assert.equal(normalize.plainText('&amp;lt;p&amp;gt;Python &amp;amp; React&amp;lt;/p&amp;gt;'), 'Python & React')

const job = { id: 'a', company: 'Example', title: 'Software Intern', location: 'Toronto', countries: ['CA'], remote: false, term: 'Summer 2027', available: true, saved: false, firstSeenAt: '2026-11-01T00:00:00.000Z', match: { score: 50 } }
const jobs = [job, { ...job, id: 'b', company: 'Other', countries: ['US'], remote: true, match: { score: 75 } }, { ...job, id: 'c', available: false, saved: true, match: { score: 100 } }]
const filters = { search: '', country: 'all', term: 'all', remote: false, savedOnly: false, sort: 'fit' }
assert.deepEqual(filterJobs(jobs, filters).map(j => j.id), ['b', 'a'])
assert.deepEqual(filterJobs(jobs, { ...filters, country: 'CA' }).map(j => j.id), ['a'])
assert.deepEqual(filterJobs(jobs, { ...filters, remote: true }).map(j => j.id), ['b'])
assert.deepEqual(filterJobs(jobs, { ...filters, search: 'other' }).map(j => j.id), ['b'])
assert.deepEqual(filterJobs(jobs, { ...filters, savedOnly: true }).map(j => j.id), ['c'], 'Closed saved roles remain visible')
assert.equal(filterJobs(jobs, { ...filters, term: 'Winter' }).length, 0)
assert.equal(filterJobs(jobs, { ...filters, term: 'Summer' }).length, 2)
const multiTerm = { ...job, title: 'Software Intern — Summer or Winter', term: 'Summer 2027' }
assert.equal(filterJobs([multiTerm], { ...filters, term: 'Winter' }).length, 1)
assert.equal(filterJobs([multiTerm], { ...filters, term: 'Summer' }).length, 1)

// A prolific employer must form one group, without losing roles or changing
// the selected ranking within that employer.
const manyRoles = Array.from({ length: 20 }, (_, i) => ({ ...job, id: `palantir-${i}`, company: 'Palantir', match: { score: 90 - i } }))
const ranked = filterJobs([...manyRoles, { ...job, id: 'stripe', company: 'Stripe', match: { score: 85 } }], filters)
const grouped = groupJobsByCompany(ranked)
assert.deepEqual(grouped.map(group => group.company), ['Palantir', 'Stripe'])
assert.equal(grouped[0].jobs.length, 20)
assert.deepEqual(grouped[0].jobs.map(job => job.id), manyRoles.map(job => job.id))
assert.equal(grouped.reduce((count, group) => count + group.jobs.length, 0), 21)
assert.deepEqual(groupJobsByCompany([]), [])

const finished = [], failed = []
let state = []
const sync = load('lib/jobs/sync.ts', {
  'server-only': {}, './sources': sources, './normalize': normalize,
  '@/lib/db/queries': {
    listJobSources: async () => state,
    claimJobSource: async () => ({}),
    finishJobSource: async (_, source, date, postings) => finished.push({ source, date, postings }),
    failJobSource: async (_, source) => failed.push(source),
  },
})
const originalFetch = globalThis.fetch
try {
  globalThis.fetch = async url => {
    if (url.includes('/stripe/')) throw new Error('Network unavailable')
    if (url.includes('/databricks/')) return { ok: true, json: async () => ({ jobs: 'invalid' }) }
    if (url.includes('/wealthsimple?')) return { ok: true, json: async () => [] }
    if (url.includes('lever.co')) return { ok: true, json: async () => [{ id: '42', text: 'Software Engineering Intern', hostedUrl: 'https://jobs.lever.co/example/42', categories: { location: 'New York, NY' }, descriptionPlain: 'Build Python and React applications alongside our software engineering team.' }] }
    const valid = { id: 42, internal_job_id: 42, title: 'Software Engineer Intern - Summer 2027', location: { name: 'Toronto, Canada' }, absolute_url: 'https://example.com/jobs/42', content: '<p>Build Python and React applications alongside our software engineering team.</p>' }
    return { ok: true, json: async () => ({ jobs: [valid, { ...valid, id: 43, title: 'Senior Software Engineer' }, { ...valid, id: 44, location: { name: 'London, UK' } }] }) }
  }
  await sync.syncJobs()
  assert.deepEqual(failed.sort(), ['greenhouse:databricks', 'greenhouse:stripe'])
  assert(!finished.some(item => failed.includes(item.source)), 'Failed or malformed feeds must not close existing jobs')
  assert.equal(finished.find(item => item.source === 'lever:wealthsimple').postings.length, 0, 'A valid empty snapshot can close jobs')
  assert(finished.filter(item => item.source.startsWith('greenhouse')).every(item => item.postings.length === 1))
  const fetched = finished.length
  const now = new Date()
  state = sources.JOB_SOURCES.map(source => ({ id: `${source.provider}:${source.board}`, checkedAt: now, attemptedAt: now, leaseUntil: now }))
  globalThis.fetch = async () => { throw new Error('Fresh sources should not be fetched') }
  await sync.syncJobs()
  assert.equal(finished.length, fetched)
} finally { globalThis.fetch = originalFetch }
console.log('PASS: resume evidence, scoring, role/region filters, bookmarks, feed validation, outage safety, and refresh cadence.')
