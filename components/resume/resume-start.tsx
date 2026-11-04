'use client'
import { ImportForm } from '@/components/resume/import-form'
import { ResumeUpload } from '@/components/resume/resume-upload'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AiSettings } from '@/components/settings/model-settings'
export function ResumeStart({ aiSettings }: { aiSettings: AiSettings }) {
  return <Tabs defaultValue="upload">
    <TabsList aria-label="Create a resume"><TabsTrigger value="upload">Upload resume</TabsTrigger><TabsTrigger value="log">Work log or template</TabsTrigger></TabsList>
    <TabsContent value="upload" className="mt-6"><ResumeUpload aiSettings={aiSettings} /></TabsContent>
    <TabsContent value="log" className="mt-6"><ImportForm aiSettings={aiSettings} /></TabsContent>
  </Tabs>
}
