import { Skeleton } from "@/components/ui/skeleton";

export default function RepresentativesLoading() {
  return (
    <div className="flex flex-col gap-6" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-52" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-5 rounded" />
            </div>
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/40 px-6 py-3 grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-6 py-4 grid grid-cols-6 gap-4 border-b border-border last:border-0">
            {Array.from({ length: 5 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
