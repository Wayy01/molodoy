import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="hidden h-11 w-44 rounded-full md:block" />
      </div>
      <div className="mb-4 hidden gap-2 md:flex">
        <Skeleton className="h-9 w-36 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
        <Skeleton className="h-9 w-40 rounded-full" />
      </div>
      <Skeleton className="hidden h-[calc(100dvh-var(--dash-top)-var(--dash-bottom)-1.5rem)] w-full rounded-2xl md:block" />
      <div className="md:hidden">
        <div className="mb-3 flex gap-2 overflow-hidden">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-28 shrink-0 rounded-full" />
          ))}
        </div>
        <Skeleton className="mb-4 h-16 w-full rounded-2xl" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem] w-full rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
