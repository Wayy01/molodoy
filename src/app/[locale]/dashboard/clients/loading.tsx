import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy>
      <Skeleton className="mb-2 h-8 w-40" />
      <Skeleton className="mb-6 h-4 w-56" />
      <div className="mb-5 flex flex-col gap-3 md:flex-row">
        <Skeleton className="h-11 md:w-96" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-24 rounded-full md:h-9" />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-[86px] rounded-2xl md:h-14" />
        ))}
      </div>
    </div>
  );
}
