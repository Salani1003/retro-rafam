import { Skeleton } from '@/components/ui/skeleton'

export function ColumnSkeleton() {
  return (
    <div className="flex w-full flex-col gap-3 rounded-[var(--radius-lg)] border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2 px-1 py-2">
        <Skeleton className="size-5 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-border p-3.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="mt-2 h-3 w-24" />
        </div>
      ))}
    </div>
  )
}
