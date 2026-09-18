'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, KeyRound, Loader2, Trash2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PROVIDERS, PROVIDER_META, modelLabel, modelsFor, type ProviderId } from '@/lib/ai/catalog'

export interface AiSettings {
  enabled: boolean
  provider: string | null
  model: string | null
  keyHint: string | null
  baseUrl?: string | null
}

export interface ModelSettingsProps {
  settings: AiSettings
  onBusyChange?: (busy: boolean) => void
  onSettingsChange?: (settings: AiSettings) => void
}

export function ModelSettings({ settings, onBusyChange, onSettingsChange }: ModelSettingsProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(settings)
  const initialProvider = PROVIDERS.includes(settings.provider as ProviderId)
    ? settings.provider as ProviderId : 'gemini'
  const [provider, setProvider] = useState<ProviderId>(initialProvider)
  const [model, setModel] = useState(settings.model ?? modelsFor(initialProvider)[0]?.id ?? '')
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl ?? '')
  const [apiKey, setApiKey] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => setCurrent(settings), [settings])
  useEffect(() => {
    onBusyChange?.(pending !== null)
    return () => onBusyChange?.(false)
  }, [pending, onBusyChange])

  const active = current.enabled && Boolean(current.keyHint)
  const manualModel = provider === 'other'

  async function call(action: string, init: RequestInit) {
    setPending(action)
    setError(null)
    setSaved(false)
    try {
      const response = await fetch('/api/settings/ai', {
        ...init, headers: { 'Content-Type': 'application/json' },
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error ?? 'Something went wrong.')
      const next: AiSettings = action === 'remove'
        ? { enabled: false, provider: null, model: null, keyHint: null, baseUrl: null }
        : { ...current, ...body }
      setCurrent(next)
      onSettingsChange?.(next)
      if (action === 'save') {
        setApiKey('')
        setSaved(true)
        setEditing(false)
      }
      router.refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Something went wrong.')
    } finally {
      setPending(null)
    }
  }

  function saveKey() {
    if (!apiKey.trim() || !model.trim() || (provider === 'other' && !baseUrl.trim())) {
      setError('Enter your API key, model, and the API base URL if using Other.')
      return
    }
    void call('save', {
      method: 'POST',
      body: JSON.stringify({ provider, model: model.trim(), apiKey: apiKey.trim(),
        baseUrl: provider === 'other' ? baseUrl.trim() : undefined }),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
        <span className="text-sm font-semibold">
          {active && current.model ? modelLabel(current.model) : 'AI generation is off'}
        </span>
        <Badge variant={active ? 'success' : 'muted'}>{active ? 'your key' : 'key required'}</Badge>
      </div>

      {current.keyHint ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">
            {PROVIDER_META[current.provider as ProviderId]?.label ?? current.provider}
            <span className="ml-2 font-mono text-xs text-muted-foreground">••••{current.keyHint}</span>
          </p>
          {current.baseUrl ? <p className="break-all text-xs text-muted-foreground">{current.baseUrl}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={pending !== null}
              onClick={() => void call('toggle', { method: 'PATCH', body: JSON.stringify({ enabled: !current.enabled }) })}>
              {current.enabled ? 'Turn off' : 'Turn on'}
            </Button>
            <Button variant="outline" size="sm" disabled={pending !== null} onClick={() => setEditing(!editing)}>
              {editing ? 'Cancel changes' : 'Change provider, model, or key'}
            </Button>
            <Button variant="ghost" size="sm" disabled={pending !== null}
              onClick={() => void call('remove', { method: 'DELETE' })}>
              <Trash2 /> Remove key
            </Button>
          </div>
          {!current.enabled ? <p className="text-xs text-muted-foreground">Your key is kept. Editing and PDF export still work while AI is off.</p> : null}
        </div>
      ) : null}

      {!current.keyHint || editing ? (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Select id="provider" value={provider} disabled={pending !== null} onChange={(event) => {
                const next = event.target.value as ProviderId
                setProvider(next)
                setModel(modelsFor(next)[0]?.id ?? '')
                setApiKey('')
                setError(null)
              }}>
                {PROVIDERS.map((id) => <option key={id} value={id}>{PROVIDER_META[id].label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">{manualModel ? 'Model ID' : 'Model'}</Label>
              {manualModel ? (
                <Input id="model" value={model} disabled={pending !== null} maxLength={120}
                  onChange={(event) => setModel(event.target.value)} placeholder="Model ID from your provider" />
              ) : (
                <Select id="model" value={model} disabled={pending !== null} onChange={(event) => setModel(event.target.value)}>
                  {modelsFor(provider).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
              )}
            </div>
          </div>
          {!manualModel ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {modelsFor(provider).find((candidate) => candidate.id === model)?.note}
            </p>
          ) : null}
          {provider === 'other' ? (
            <div className="space-y-1.5">
              <Label htmlFor="base-url">API base URL</Label>
              <Input id="base-url" type="url" value={baseUrl} disabled={pending !== null}
                onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://your-provider.com/v1" />
              <p className="text-xs text-muted-foreground">Use your provider’s public HTTPS base URL, including its API version path. Cadence appends /chat/completions.</p>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="api-key">API key</Label>
            <Input id="api-key" type="password" autoComplete="off" spellCheck={false}
              value={apiKey} disabled={pending !== null} onChange={(event) => setApiKey(event.target.value)}
              placeholder={editing ? 'Re-enter or replace your key to verify changes' : 'Paste your key'} />
            <p className="text-xs leading-relaxed text-muted-foreground">
              {PROVIDER_META[provider].keyHint}{' '}
              {PROVIDER_META[provider].keyUrl ? (
                <a href={PROVIDER_META[provider].keyUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2">
                  Get an API key <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </p>
          </div>
          <Button variant="success" onClick={saveKey} disabled={pending !== null}>
            {pending === 'save' ? <Loader2 className="animate-spin" /> : <KeyRound />}
            {pending === 'save' ? 'Verifying…' : 'Verify and save'}
          </Button>
        </div>
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p role="status" className="flex items-center gap-2 text-sm text-success"><Check className="h-4 w-4" />Key verified and saved.</p> : null}
      <p className="text-xs leading-relaxed text-muted-foreground">
        Your key is encrypted before storage and never sent back to the browser.
        Verification makes a small request to your provider. AI requests use your provider’s quota
        and billing; your log and resume text go to the provider you choose.
      </p>
    </div>
  )
}
