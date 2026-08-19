import { CopyButton } from '@/components/copy-button'
import type { AgentConfig } from '@/lib/agents'

export function AgentSnippet({ agent }: { agent: AgentConfig }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">Paste into</p>
          <code className="font-mono text-xs text-foreground">{agent.configPath}</code>
        </div>
        <CopyButton value={agent.snippet} label="Copy" />
      </div>

      {agent.note ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{agent.note}</p>
      ) : null}

      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-card p-4 text-[11px] leading-relaxed">
        <code>{agent.snippet}</code>
      </pre>
    </div>
  )
}
