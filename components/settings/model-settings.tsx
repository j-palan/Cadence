'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, KeyRound, Loader2, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  PROVIDERS,
  PROVIDER_META,
  modelLabel,
  modelsFor,
  type ProviderId,
} from '@/lib/ai/catalog'
import { cn } from '@/lib/utils'

export interface ModelSettingsProps {
  /** Never includes the key itself — only its last four characters. */
  settings: {
    enabled: boolean
    provider: string | null
    model: string | null
    keyHint: string | null
  }
  /** What generation falls back to when own-key is off. */
  defaultModel: string
}

export function ModelSettings({ settings, defaultModel }: ModelSettingsProps) {
  const router = useRouter()

  const storedProvider = (settings.provider ?? 'gemini') as ProviderId
  const [provider, setProvider] = useState<ProviderId>(storedProvider)
  const [model, setModel] = useState(settings.model ?? modelsFor(storedProvider)[0].id)
  const [apiKey, setApiKey] = useState('')
  const [pending, setPending] = useState<null | 'save' | 'toggle' | 'switch' | 'remove'>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const hasKey = Boolean(settings.keyHint)
  const active = settings.enabled && hasKey
  const activeModel = active && settings.model ? settings.model : defaultModel

  async function call(
    action: Exclude<typeof pending, null>,
    init: RequestInit,
  ): Promise<boolean> {
    setPending(action)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch('/api/settings/ai', {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'Something went wrong.')
      }
      router.refresh()
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
      return false
    } finally {
      setPending(null)
    }
  }

  async function saveKey() {
    if (apiKey.trim().length < 16) {
      setError('That does not look like an API key.')
      return
    }
    const ok = await call('save', {
      method: 'POST',
      body: JSON.stringify({ provider, model, apiKey: apiKey.trim() }),
    })
    if (ok) {
      setApiKey('')
      setSaved(true)
    }
  }

  return (
    <div className="space-y-6">
      {/* What is actually running right now. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Using</span>
        <span className="text-sm font-semibold">{modelLabel(activeModel)}</span>
        <Badge variant={active ? 'success' : 'muted'}>
          {active ? 'your key' : "Cadence's key"}
        </Badge>
      </div>

      {hasKey ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                {PROVIDER_META[storedProvider].label}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                ••••••••{settings.keyHint}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={settings.enabled ? 'outline' : 'success'}
                size="sm"
                disabled={pending !== null}
                onClick={() =>
                  void call('toggle', {
                    method: 'PATCH',
                    body: JSON.stringify({ enabled: !settings.enabled }),
                  })
                }
              >
                {pending === 'toggle' ? <Loader2 className="animate-spin" /> : null}
                {settings.enabled ? 'Turn off' : 'Turn on'}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                aria-label="Remove key"
                title="Remove key"
                className="text-muted-foreground hover:text-destructive"
                disabled={pending !== null}
                onClick={() => void call('remove', { method: 'DELETE' })}
              >
                {pending === 'remove' ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </div>
          </div>

          {/* Model switching stays inside the provider the key belongs to. */}
          <div className="space-y-1.5">
            <Label htmlFor="active-model" className="text-xs text-muted-foreground">
              Model
            </Label>
            <Select
              id="active-model"
              value={settings.model ?? ''}
              disabled={pending !== null}
              onChange={(event) =>
                void call('switch', {
                  method: 'PATCH',
                  body: JSON.stringify({ model: event.target.value }),
                })
              }
            >
              {modelsFor(storedProvider).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} — {m.note}
                </option>
              ))}
            </Select>
            {!settings.enabled ? (
              <p className="text-xs text-muted-foreground">
                Turned off, so generation is using Cadence&apos;s default. Your key is kept.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider" className="text-xs text-muted-foreground">
                Provider
              </Label>
              <Select
                id="provider"
                value={provider}
                disabled={pending !== null}
                onChange={(event) => {
                  const next = event.target.value as ProviderId
                  setProvider(next)
                  // Keep the model valid for the newly chosen provider.
                  setModel(modelsFor(next)[0].id)
                }}
              >
                {PROVIDERS.map((id) => (
                  <option key={id} value={id}>
                    {PROVIDER_META[id].label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="model" className="text-xs text-muted-foreground">
                Model
              </Label>
              <Select
                id="model"
                value={model}
                disabled={pending !== null}
                onChange={(event) => setModel(event.target.value)}
              >
                {modelsFor(provider).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {modelsFor(provider).find((m) => m.id === model)?.note}
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="api-key" className="text-xs text-muted-foreground">
              API key
            </Label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              disabled={pending !== null}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder="Paste your key"
              className="font-mono text-xs"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {PROVIDER_META[provider].keyHint}{' '}
              <a
                href={PROVIDER_META[provider].keyUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                Get one
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          <Button variant="success" onClick={saveKey} disabled={pending !== null}>
            {pending === 'save' ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {pending === 'save' ? 'Verifying…' : 'Verify and save'}
          </Button>
        </div>
      )}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {saved ? (
        <p className={cn('flex items-center gap-2 text-sm text-success')}>
          <Check className="h-4 w-4" strokeWidth={3} />
          Key verified and saved.
        </p>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Your key is encrypted before it is stored and never sent back to the browser. Cadence uses
        it only to generate your resumes — your log and resume text go to whichever provider you
        pick.
      </p>
    </div>
  )
}
