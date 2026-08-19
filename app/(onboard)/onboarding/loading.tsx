import { Skeleton } from '@/components/ui/skeleton'

export default function OnboardingLoading() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-0.5 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-12 space-y-6">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <div className="grid gap-2 sm:grid-cols-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-[68px] rounded-lg" />
          ))}
        </div>
      </div>
    </main>
  )
}
