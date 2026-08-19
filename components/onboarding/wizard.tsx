'use client'

import { useMemo, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'

import { finishOnboarding } from '@/app/(onboard)/onboarding/actions'
import { AgentSnippet } from '@/components/onboarding/agent-snippet'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AGENTS, LOG_PATH } from '@/lib/agents'
import { cn } from '@/lib/utils'

const STEPS = ['Agents', 'Instruction', 'Done'] as const

export function OnboardingWizard({ initialAgents }: { initialAgents: string[] }) {
  const [step, setStep] = useState(0)
  const [selected, setSelected] = useState<string[]>(initialAgents)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const chosen = useMemo(() => AGENTS.filter((a) => selected.includes(a.id)), [selected])

  function toggle(id: string) {
    setError(null)
    setSelected((current) =>
      current.includes(id) ? current.filter((v) => v !== id) : [...current, id],
    )
  }

  function next() {
    if (step === 0 && selected.length === 0) {
      setError('Pick at least one agent.')
      return
    }
    setStep((c) => Math.min(c + 1, STEPS.length - 1))
  }

  function finish() {
    startTransition(async () => {
      const result = await finishOnboarding(selected)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-12">
      {/* Progress: a thin rule per step, not a numbered breadcrumb. */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, index) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                'h-0.5 rounded-full transition-colors',
                index <= step ? 'bg-success' : 'bg-border',
              )}
            />
            <p
              className={cn(
                'mt-2 text-xs transition-colors',
                index === step ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <section className="animate-fade-up space-y-6">
          <div className="space-y-2">
            <h1 className="text-display-sm">Which agents do you code with?</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You&apos;ll get the exact snippet for each one you pick.
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {AGENTS.map((agent) => {
              const checked = selected.includes(agent.id)
              return (
                <button
                  key={agent.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggle(agent.id)}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    checked
                      ? 'border-success bg-success/[0.06]'
                      : 'border-border bg-card hover:border-foreground/20',
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{agent.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                      {agent.configPath}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors',
                      checked
                        ? 'border-success bg-success text-success-foreground'
                        : 'border-input',
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="animate-fade-up space-y-6">
          <div className="space-y-2">
            <h1 className="text-display-sm">Add the instruction</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Paste this into each agent&apos;s config. From then on it appends your wins to{' '}
              <code className="font-mono text-xs text-foreground">{LOG_PATH}</code>.
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
        <section className="animate-fade-up space-y-4">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-success/12 text-success">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
          <h1 className="text-display-sm">Go code something great.</h1>
          <p className="max-w-readable text-sm leading-relaxed text-muted-foreground">
            Come back in a week. Your agents will have been writing to{' '}
            <code className="font-mono text-xs text-foreground">{LOG_PATH}</code> the whole time —
            import it and Cadence turns it into a resume.
          </p>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex items-center justify-between border-t border-border pt-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStep((c) => Math.max(c - 1, 0))}
          disabled={step === 0 || pending}
        >
          <ArrowLeft />
          Back
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="sm" onClick={next}>
            Continue
            <ArrowRight />
          </Button>
        ) : (
          <Button size="sm" onClick={finish} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Go to dashboard
            {pending ? null : <ArrowRight />}
          </Button>
        )}
      </div>
    </div>
  )
}
