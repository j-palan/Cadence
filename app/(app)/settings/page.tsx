import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

import { AgentSnippet } from '@/components/onboarding/agent-snippet'
import { OnboardingWizard } from '@/components/onboarding/wizard'
import { Appearance } from '@/components/settings/appearance'
import { ModelSettings } from '@/components/settings/model-settings'
import { DeleteAccount } from '@/components/settings/delete-account'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AGENTS, LOG_PATH } from '@/lib/agents'
import { requireOnboardedUser } from '@/lib/auth-guards'
import { countResumes, getAiSettingsForClient, getUser } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; returnTo?: string }
}) {
  const sessionUser = await requireOnboardedUser()

  const [user, resumeCount, aiSettings] = await Promise.all([
    getUser(sessionUser.id),
    countResumes(sessionUser.id),
    // Deliberately the client-safe reader: no ciphertext crosses this boundary.
    getAiSettingsForClient(sessionUser.id),
  ])

  if (!user) redirect('/login')

  const chosen = AGENTS.filter((agent) => user.agents.includes(agent.id))
  const editorReturnPath = searchParams.returnTo?.startsWith('/resume/')
    ? searchParams.returnTo
    : null

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-14">
      {editorReturnPath ? (
        <Button asChild variant="ghost" size="sm" className="-ml-3 w-fit">
          <Link href={editorReturnPath}>
            <ArrowLeft /> Back to editor
          </Link>
        </Button>
      ) : null}
      <div>
        <h1 className="text-display-sm">Settings</h1>
        <p className="mt-3 text-sm text-muted-foreground">Account, agents, and data.</p>
      </div>

      <Tabs defaultValue={searchParams.tab === 'onboarding' ? 'onboarding' : 'general'}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>
        <TabsContent value="onboarding">
          <Card>
            <CardHeader>
              <CardTitle>Revisit onboarding</CardTitle>
              <CardDescription>
                Run through setup again. Saved API keys and agent choices apply to your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OnboardingWizard
                initialAgents={user.agents}
                aiSettings={
                  aiSettings ?? {
                    enabled: false,
                    provider: null,
                    model: null,
                    keyHint: null,
                    baseUrl: null,
                  }
                }
                revisiting
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="general" className="space-y-6">
          <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Cadence opens in light mode by default.</CardDescription>
        </CardHeader>
        <CardContent>
          <Appearance />
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in with Google. There is no password to manage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Email" value={<span className="font-mono">{user.email}</span>} />
          <Row label="Name" value={user.name ?? '—'} />
          <Row
            label="Joined"
            value={user.createdAt.toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
          <Row label="Resumes" value={String(resumeCount)} />
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle>Model</CardTitle>
          <CardDescription>
            Add your own API key to use AI generation. You can edit and compile resumes without one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ModelSettings
            settings={{
              enabled: aiSettings?.enabled ?? false,
              provider: aiSettings?.provider ?? null,
              model: aiSettings?.model ?? null,
              keyHint: aiSettings?.keyHint ?? null,
              baseUrl: aiSettings?.baseUrl ?? null,
            }}
          />
        </CardContent>
          </Card>

          <Card>
        <CardHeader>
          <CardTitle>Your agents</CardTitle>
          <CardDescription>
            The snippets you set up during onboarding. They append to{' '}
            <code className="text-primary">{LOG_PATH}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chosen.length === 0 ? (
            <p className="text-sm text-muted-foreground">No agents selected.</p>
          ) : (
            <Tabs defaultValue={chosen[0].id}>
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
          )}
        </CardContent>
          </Card>

          <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Danger zone
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              permanent
            </Badge>
          </CardTitle>
          <CardDescription>
            Deleting your account removes your resumes and imported logs at the same time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteAccount email={user.email} />
        </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}
