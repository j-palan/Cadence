'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Loader2, PartyPopper } from 'lucide-react'

import { finishOnboarding } from '@/app/(onboard)/onboarding/actions'
import { AgentSnippet } from '@/components/onboarding/agent-snippet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AGENTS, LOG_PATH } from '@/lib/agents'
import { cn } from '@/lib/utils'

const STEPS = ['Pick your agents', 'Add the instruction', 'Done'] as const

export function OnboardingWizard({ initialAgents }: { initialAgents: string[] }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>(initialAgents)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const chosen = useMemo(
    () => AGENTS.filter((agent) => selected.includes(agent.id)),
    [selected],
  )

  function toggle(id: string) {
    setError(null)
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  function next() {
    if (step === 0 && selected.length === 0) {
      setError('Pick at least one agent.')
      return
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function finish() {
    startTransition(async () => {
      const result = await finishOnboarding(selected)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap items-center gap-2 text-xs">
        {STEPS.map((label, index) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-sm border font-mono text-[11px]',
                index === step
                  ? 'border-primary bg-primary/15 text-primary'
                  : index < step
                    ? 'border-success/50 bg-success/15 text-success'
                    : 'border-border text-muted-foreground',
              )}
            >
              {index + 1}
            </span>
            <span className={index === step ? 'text-foreground' : 'text-muted-foreground'}>
              {label}
            </span>
            {index < STEPS.length - 1 ? (
              <span className="mx-1 h-px w-6 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-medium tracking-tight">Which agents do you code with?</h2>
            <p className="text-sm text-muted-foreground">
              Pick every one you use. You will get a snippet for each.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {AGENTS.map((agent) => {
              const checked = selected.includes(agent.id)
              return (
                <label
                  key={agent.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors',
                    checked
                      ? 'border-primary/60 bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40',
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(agent.id)}
                    className="mt-0.5"
                  />
                  <span className="space-y-1">
                    <span className="block text-sm font-medium">{agent.name}</span>
                    <code className="block text-xs text-muted-foreground">{agent.configPath}</code>
                  </span>
                </label>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-medium tracking-tight">Add the logging instruction</h2>
            <p className="text-sm text-muted-foreground">
              Paste this into each agent&apos;s config. From then on it appends your wins to{' '}
              <code className="text-primary">{LOG_PATH}</code> as they happen.
            </p>
          </div>

          <Tabs defaultValue={chosen[0]?.id}>
            <TabsList className="flex-wrap">
              {chosen.map((agent) => (
                <TabsTrigger key={agent.id} value={agent.id}>
                  {agent.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {chosen.map((agent) => (
              <TabsContent key={agent.id} value={agent.id}>
                <AgentSnippet agent={agent} />
              </TabsContent>
            ))}
          </Tabs>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <Badge variant="success">
            <PartyPopper className="h-3 w-3" />
            Set up
          </Badge>
          <div className="space-y-2">
            <h2 className="text-lg font-medium tracking-tight">Go code something great.</h2>
            <p className="text-sm text-muted-foreground">
              Come back in a week. Your agents will have been writing to{' '}
              <code className="text-primary">{LOG_PATH}</code> the whole time — import it and
              Cadence turns it into a resume.
            </p>
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={next}>
            Next
            <ArrowRight />
          </Button>
        ) : (
          <Button size="sm" onClick={finish} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Go to dashboard
          </Button>
        )}
      </div>
    </div>
  )
}
