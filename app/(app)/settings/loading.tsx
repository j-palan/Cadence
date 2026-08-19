import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-6 py-14">
      <div>
        <Skeleton className="h-9 w-40" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>

      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-full max-w-sm" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((j) => (
              <div key={j} className="flex justify-between gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </main>
  )
}
