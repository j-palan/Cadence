/**
 * The coding agents Cadence knows how to hook into, and the exact snippet to
 * paste into each one's config. Isomorphic — the onboarding wizard renders this
 * on the client.
 *
 * Every agent logs to the same path, so the import step has one answer no
 * matter which agents a user picked.
 */

export const LOG_PATH = '~/cadence-log.md'

export interface AgentConfig {
  id: string
  name: string
  /** Where the instruction goes. Shown verbatim next to the snippet. */
  configPath: string
  /** Extra context when the file location is not self-explanatory. */
  note?: string
  snippet: string
}

const INSTRUCTION = `## Cadence resume log

Whenever we finish something notable — a feature shipped, a system designed, a
hard bug fixed, a measurable improvement — append a one-line, impact-first
bullet to ${LOG_PATH} (create the file if it does not exist). Include numbers
where they exist: latency, throughput, error rate, users, cost. Group bullets
under a \`## <project>\` heading. Skip trivia like typo fixes and routine
chores. Do this without being asked, and do not ask for confirmation.`

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
