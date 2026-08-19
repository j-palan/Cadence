/**
 * The coding agents Cadence knows how to hook into, and the exact snippet to
 * paste into each one's config. Isomorphic — the onboarding wizard renders this
 * on the client.
 *
 * Every agent logs to the same path, so the import step has one answer no
 * matter which agents a user picked.
 */

export const LOG_PATH = '~/.claude/resume-log.md'

export interface AgentConfig {
  id: string
  name: string
  /** Where the instruction goes. Shown verbatim next to the snippet. */
  configPath: string
  /** Extra context when the file location is not self-explanatory. */
  note?: string
  snippet: string
}

/**
 * The instruction users paste into their agent's config.
 *
 * Kept verbatim rather than paraphrased — this is the wording that is actually
 * in production use, and the log path here is the one the import step reads.
 * If you edit the path, edit LOG_PATH above too; the whole UI renders from it.
 */
const INSTRUCTION = `# Global instructions

## Resume log (auto-maintained — applies to every session and repo)

Maintain a running resume log at \`~/.claude/resume-log.md\`.

Automatically — **without being asked** — append concise, quantified, resume-worthy
accomplishments whenever the user completes notable technical work (a feature shipped,
a system designed/built, a hard bug debugged, a tool/integration, a measurable result).

- Group related work under existing project/theme headings; do not duplicate — merge into
  the relevant section.
- Impact-first, with metrics where available; keep each bullet to one line.
- Skip trivia (typo fixes, routine chores). Capture substance.
- Update the "Last updated" date when you add entries.

Also keep the **Skills & Technologies** section at the top of the log current: whenever
new languages, tools, frameworks, APIs, or techniques get used, add them to the right
category there (don't duplicate existing items). Treat this the same as resume points —
update it automatically, without being asked.

Do this quietly in the background; never ask whether to log — just do it.`

export const AGENTS: AgentConfig[] = [
  {
    id: 'claude_code',
    name: 'Claude Code',
    configPath: '~/.claude/CLAUDE.md',
    note: 'Applies to every project. Use ./CLAUDE.md instead to scope it to one repo.',
    snippet: INSTRUCTION,
  },
  {
    id: 'cursor',
    name: 'Cursor',
    configPath: '.cursor/rules/cadence.mdc',
    note: 'The frontmatter is what keeps the rule in context on every request.',
    snippet: `---
description: Cadence resume log
alwaysApply: true
---

${INSTRUCTION}`,
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    configPath: '.github/copilot-instructions.md',
    note: 'Committed to the repo, so it applies for everyone working in it.',
    snippet: INSTRUCTION,
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    configPath: '~/.codeium/windsurf/memories/global_rules.md',
    note: 'Global rules. Use .windsurf/rules/cadence.md to scope it to one workspace.',
    snippet: INSTRUCTION,
  },
  {
    id: 'cline',
    name: 'Cline',
    configPath: '.clinerules/cadence.md',
    snippet: INSTRUCTION,
  },
  {
    id: 'aider',
    name: 'Aider',
    configPath: 'CONVENTIONS.md',
    note: 'Then load it on every run: add `read: CONVENTIONS.md` to .aider.conf.yml.',
    snippet: INSTRUCTION,
  },
]

export const AGENT_IDS = AGENTS.map((a) => a.id)

export function agentById(id: string): AgentConfig | undefined {
  return AGENTS.find((agent) => agent.id === id)
}

export function agentNames(ids: string[]): string[] {
  return ids.map((id) => agentById(id)?.name ?? id)
}
