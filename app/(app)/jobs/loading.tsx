import { Skeleton } from '@/components/ui/skeleton'

export default function JobsLoading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-14" aria-label="Loading job board">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-9 w-56" />
      <Skeleton className="mt-3 h-4 w-64" />
      <Skeleton className="mt-10 h-48 w-full rounded-xl" />
      <div className="mt-6 space-y-4">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
      </div>
    </main>
  )
}
