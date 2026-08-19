import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

import { auth } from '@/auth'
import { AgentSnippet } from '@/components/onboarding/agent-snippet'
import { DeleteAccount } from '@/components/settings/delete-account'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AGENTS, LOG_PATH } from '@/lib/agents'
import { countResumes, getUser } from '@/lib/db/queries'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [user, resumeCount] = await Promise.all([
    getUser(session.user.id),
    countResumes(session.user.id),
  ])

  if (!user) redirect('/login')

  const chosen = AGENTS.filter((agent) => user.agents.includes(agent.id))

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <div className="space-y-1">
        <h1 className="text-xl font-medium tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Account, agents, and data.</p>
      </div>

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

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Danger zone
            <Badge variant="outline" className="border-destructive/40 text-destructive">
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
