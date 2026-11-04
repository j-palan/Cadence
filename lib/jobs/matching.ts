/** Deterministic, versioned resume evidence matching. No provider or network calls. */
export const MATCH_VERSION = 2
const skills: Record<string, string[]> = {
  JavaScript: ['javascript', 'js'], TypeScript: ['typescript'], Python: ['python'],
  Java: ['java'], 'C++': ['c++'], 'C#': ['c#', 'csharp'], C: ['c'], Go: ['golang', 'go'],
  Rust: ['rust'], Ruby: ['ruby'], Swift: ['swift'], Kotlin: ['kotlin'], SQL: ['sql'],
  React: ['react', 'reactjs', 'react.js'], 'Next.js': ['next.js', 'nextjs'],
  'Node.js': ['node.js', 'nodejs'], Django: ['django'], Flask: ['flask'],
  FastAPI: ['fastapi'], Spring: ['spring boot', 'spring framework'], Rails: ['rails'],
  PostgreSQL: ['postgresql', 'postgres'], MySQL: ['mysql'], MongoDB: ['mongodb'],
  Redis: ['redis'], Docker: ['docker'], Kubernetes: ['kubernetes', 'k8s'],
  AWS: ['aws', 'amazon web services'], GCP: ['gcp', 'google cloud'], Azure: ['azure'],
  Git: ['git', 'github', 'gitlab'], Linux: ['linux'], GraphQL: ['graphql'],
  'REST APIs': ['rest', 'restful'], 'CI/CD': ['ci/cd', 'continuous integration'],
  'Unit testing': ['unit testing', 'unit tests', 'junit', 'pytest', 'jest'],
  'Data structures': ['data structures'], Algorithms: ['algorithms', 'algorithm design'],
  'Distributed systems': ['distributed systems'], 'Machine learning': ['machine learning', 'pytorch', 'tensorflow'],
}
function contains(text: string, term: string) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Do not interpret ordinary prose ("go above and beyond") as the Go language.
  const pattern = new RegExp(`(?<![a-z0-9+#])${escaped}(?![a-z0-9+#])`, term === 'go' || term === 'c' ? '' : 'i')
  if (term === 'go') return /(?<![a-zA-Z])Go(?![a-zA-Z])/.test(text)
  if (term === 'c') return /(?<![a-zA-Z0-9+#])C(?![a-zA-Z0-9+#])/.test(text)
  return pattern.test(text)
}

export function resumeText(source: string): string {
  const body = source.includes('\\begin{document}') ? source.split('\\begin{document}')[1] : source
  return body
    .replace(/(?<!\\)%[^\n]*/g, '')
    .replace(/\\(?:href|url)\{[^}]*\}/g, '') // URLs are not skill evidence.
    .replace(/\\(?:label|includegraphics)(?:\[[^\]]*\])?\{[^}]*\}/g, '')
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, ' ')
    .replace(/\\([&#_%$])/g, '$1').replace(/[{}]/g, ' ').replace(/\s+/g, ' ').trim()
}
export interface ResumeProfile { text: string; skills: string[] }
export function extractProfile(source: string): ResumeProfile {
  const text = resumeText(source)
  return { text, skills: Object.entries(skills).filter(([, aliases]) => aliases.some(a => contains(text, a))).map(([name]) => name) }
}
export type Importance = 'required' | 'preferred' | 'general'
export interface Match {
  score: number | null
  matched: string[]
  missing: string[]
  criteria: number
  requirements: { skill: string; importance: Importance; weight: number; matched: boolean }[]
  eligibility: { graduation: string[]; authorization: string[]; availability: string[] }
  evidence: { skill: string; text: string }[]
}

function analyzePosting(description: string) {
  const found = new Map<string, Importance>()
  const priority = { preferred: 1, general: 2, required: 3 }
  const eligibility: Match['eligibility'] = { graduation: [], authorization: [], availability: [] }
  let section: Importance = 'general'
  for (const raw of description.split(/\n|(?<=[.!?])\s+/)) {
    const line = raw.trim()
    if (!line) continue
    if (line.length < 100) {
      if (/^(?:nice.to.have|preferred|bonus|desired|additional qualifications)/i.test(line)) section = 'preferred'
      else if (/^(?:requirements|qualifications|minimum qualifications|basic qualifications|required|what (?:you bring|we.re looking for|you.ll need))/i.test(line)) section = 'required'
      else if (/^(?:responsibilities|benefits|about us|what you.ll do|compensation|our team)/i.test(line)) section = 'general'
    }
    const importance: Importance = /nice.to.have|preferred|bonus|a plus|ideally|desired/i.test(line) ? 'preferred'
      : /\b(required|must|minimum|mandatory)\b/i.test(line) ? 'required' : section
    for (const [skill, aliases] of Object.entries(skills)) {
      if (aliases.some(alias => contains(line, alias)) && (!found.has(skill) || priority[importance] > priority[found.get(skill)!])) found.set(skill, importance)
    }
    const excerpt = line.slice(0, 300)
    if (/graduat|pursuing|enrolled|bachelor|master.s degree|university degree/i.test(line)) eligibility.graduation.push(excerpt)
    if (/work authori[sz]|authori[sz](?:ed|ation) to work|visa|sponsor|citizen|eligible to work|right to work/i.test(line)) eligibility.authorization.push(excerpt)
    if (/availab|(?:internship|program).{0,50}(?:weeks|months)|(?:start|begin).{0,40}20\d{2}|return.{0,30}(?:school|university)/i.test(line)) eligibility.availability.push(excerpt)
  }
  for (const key of Object.keys(eligibility) as (keyof typeof eligibility)[]) eligibility[key] = Array.from(new Set(eligibility[key])).slice(0, 3)
  return { found, eligibility, priority }
}

export function matchJob(profile: ResumeProfile | null, description: string): Match {
  const { found, eligibility, priority } = analyzePosting(description)
  const requirements = Array.from(found, ([skill, importance]) => ({ skill, importance, weight: priority[importance], matched: !!profile?.skills.includes(skill) }))
  const matched = profile ? requirements.filter(item => item.matched).map(item => item.skill) : []
  const missing = profile ? requirements.filter(item => !item.matched).map(item => item.skill) : []
  const total = requirements.reduce((sum, item) => sum + item.weight, 0)
  const overlap = requirements.reduce((sum, item) => sum + (item.matched ? item.weight : 0), 0)
  return {
    score: profile && profile.text.length >= 50 && total ? Math.round(overlap / total * 100) : null,
    matched, missing, criteria: requirements.length, requirements, eligibility,
    evidence: matched.map(skill => {
      const aliases = skills[skill]
      const index = aliases.map(a => profile!.text.toLowerCase().indexOf(a)).filter(i => i >= 0).sort((a,b) => a-b)[0] ?? 0
      return { skill, text: profile!.text.slice(Math.max(0, index - 65), index + 130).trim() }
    }),
  }
}
