export const APPLICATION_STATUSES = ['saved', 'applied', 'interviewing', 'closed'] as const
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]
export interface JobApplication {
  hasSnapshot: boolean
  status: ApplicationStatus
  resumeId: string | null
  resumeName: string | null
  appliedAt: string | null
  notes: string
}
export const APPLICATION_LABELS: Record<ApplicationStatus, string> = { saved: 'Saved', applied: 'Applied', interviewing: 'Interviewing', closed: 'Closed' }
