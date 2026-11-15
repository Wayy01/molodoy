import { Skeleton } from "@/components/ui/skeleton";

export default function AppointmentsLoading() {
  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
        <Skeleton className="h-11 w-36 rounded-full" />
      </div>
      <div className="mb-5 flex gap-2">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-11 w-28 rounded-full md:h-9" />
        ))}
      </div>
      <div className="mb-5 hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem]" />
        ))}
      </div>
      <Skeleton className="hidden h-[32rem] w-full rounded-2xl md:block" />
      <div className="flex flex-col gap-2 md:hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
