import { Skeleton } from "@/components/ui/skeleton";

export default function OverviewLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-20 shrink-0 rounded-full sm:h-9" />
          ))}
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-[7.25rem] rounded-2xl" />
        ))}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-[22rem] rounded-2xl lg:col-span-2" />
        <Skeleton className="h-[22rem] rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
