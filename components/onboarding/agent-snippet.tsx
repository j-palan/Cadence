import { CopyButton } from '@/components/copy-button'
import type { AgentConfig } from '@/lib/agents'

export function AgentSnippet({ agent }: { agent: AgentConfig }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Paste into</p>
          <code className="text-sm text-primary">{agent.configPath}</code>
        </div>
        <CopyButton value={agent.snippet} label="Copy snippet" />
      </div>

      {agent.note ? <p className="text-xs text-muted-foreground">{agent.note}</p> : null}

      <pre className="max-h-72 overflow-auto rounded-md border border-border bg-card p-3 text-xs leading-relaxed">
        <code>{agent.snippet}</code>
      </pre>
    </div>
  )
}
