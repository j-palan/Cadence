import { Skeleton } from '@/components/ui/skeleton'

export default function NewResumeLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-5 h-9 w-56" />
      <Skeleton className="mt-4 h-4 w-full max-w-md" />

      <div className="mt-12 space-y-8">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full max-w-xs" />
        </div>
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-full max-w-lg" />
          <Skeleton className="h-56 w-full rounded-lg" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-10 w-52" />
        </div>
      </div>
    </main>
  )
}
