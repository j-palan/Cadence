/** Deterministic, versioned resume evidence matching. No provider or network calls. */
export const MATCH_VERSION = 1
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
export interface Match {
  score: number | null
  matched: string[]
  missing: string[]
  criteria: number
  evidence: { skill: string; text: string }[]
}
export function matchJob(profile: ResumeProfile | null, description: string): Match {
  const criteria = Object.entries(skills).filter(([, aliases]) => aliases.some(a => contains(description, a))).map(([name]) => name)
  const matched = profile ? criteria.filter(s => profile.skills.includes(s)) : []
  const missing = profile ? criteria.filter(s => !profile.skills.includes(s)) : []
  return {
    score: profile && profile.text.length >= 50 && criteria.length ? Math.round(matched.length / criteria.length * 100) : null,
    matched, missing, criteria: criteria.length,
    evidence: matched.map(skill => {
      const aliases = skills[skill]
      const index = aliases.map(a => profile!.text.toLowerCase().indexOf(a)).filter(i => i >= 0).sort((a,b) => a-b)[0] ?? 0
      return { skill, text: profile!.text.slice(Math.max(0, index - 65), index + 130).trim() }
    }),
  }
}
