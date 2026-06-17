import { Skeleton } from "@/components/ui/skeleton";

export default function ApprovalsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card px-5 py-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-7 w-14 rounded-lg" />
                <Skeleton className="h-7 w-10 rounded-lg" />
                <Skeleton className="h-7 w-10 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
