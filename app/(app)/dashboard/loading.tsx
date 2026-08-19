import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Three is the common case and fills a row; more would imply a count
            we do not know yet. */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-5 space-y-1.5">
              <Skeleton className="h-1.5 w-1/3" />
              <Skeleton className="h-1 w-1/4" />
              <div className="mt-3 h-px w-full bg-border" />
              <Skeleton className="h-1 w-full" />
              <Skeleton className="h-1 w-5/6" />
              <Skeleton className="h-1 w-2/3" />
            </div>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
    </main>
  )
}
