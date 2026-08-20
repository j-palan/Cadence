/**
 * The models Cadence can drive, and which provider each belongs to.
 *
 * Isomorphic — the settings UI renders from this. Model IDs are verified against
 * each provider rather than recalled: the Gemini list came from `models.list()`
 * on a live key, and the Anthropic list from the current published model table.
 * A wrong ID here surfaces as a 404 the user cannot fix, so do not guess.
 */

export const PROVIDERS = ['gemini', 'anthropic'] as const

export type ProviderId = (typeof PROVIDERS)[number]

export interface ProviderMeta {
  id: ProviderId
  label: string
  /** Where a user goes to get a key. */
  keyUrl: string
  keyHint: string
}

export const PROVIDER_META: Record<ProviderId, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'From Google AI Studio. The free tier is generous.',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic Claude',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'From the Anthropic console. Paid, and the strongest at following the layout rules.',
  },
}

export interface ModelMeta {
  id: string
  provider: ProviderId
  label: string
  note: string
}

export const MODELS: ModelMeta[] = [
  // --- Gemini ---
  {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    label: 'Gemini 3.6 Flash',
    note: 'Fast and cheap. What Cadence uses by default.',
  },
  {
    id: 'gemini-3.7-flash',
    provider: 'gemini',
    label: 'Gemini 3.7 Flash',
    note: 'Newer, but often busy on the free tier.',
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'gemini',
    label: 'Gemini 3.5 Flash',
    note: 'The quickest of the three in testing.',
  },
  {
    id: 'gemini-pro-latest',
    provider: 'gemini',
    label: 'Gemini Pro',
    note: 'Slower and pricier; better at holding the one-page budget.',
  },
  // --- Anthropic ---
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
    note: 'Best balance of quality and cost. Followed the layout rules first try.',
  },
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    label: 'Claude Opus 5',
    note: 'The most capable, and the most expensive.',
  },
  {
    id: 'claude-haiku-4-5',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    note: 'Cheapest Claude. Needs more prompt hand-holding.',
  },
]

export function modelsFor(provider: ProviderId): ModelMeta[] {
  return MODELS.filter((m) => m.provider === provider)
}

export function findModel(id: string): ModelMeta | undefined {
  return MODELS.find((m) => m.id === id)
}

export function isValidPair(provider: string, model: string): provider is ProviderId {
  return MODELS.some((m) => m.provider === provider && m.id === model)
}

/** Shown wherever the active model is named. */
export function modelLabel(id: string): string {
  return findModel(id)?.label ?? id
}
