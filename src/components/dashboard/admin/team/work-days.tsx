import type { WeeklyHours } from "@/db/schema";
import { cn } from "@/lib/utils";

/** Monday first, matching how the week is read in Moldova. Values index into WeeklyHours (0 = Sunday). */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** Seven day chips; filled = working. `labels` is common.weekdays.short (Sunday first). */
export function WorkDays({ hours, labels, className }: { hours: WeeklyHours; labels: string[]; className?: string }) {
  return (
    <div className={cn("flex gap-1", className)}>
      {WEEK_ORDER.map((d) => {
        const day = hours[d];
        return (
          <span
            key={d}
            title={day ? `${labels[d]} ${day.start}-${day.end}` : labels[d]}
            className={cn(
              "flex h-7 min-w-0 flex-1 items-center justify-center rounded-full text-[11px] font-medium",
              day ? "bg-surface-3 text-fg" : "border border-dashed border-line-strong text-subtle",
            )}
          >
            {labels[d]}
          </span>
        );
      })}
    </div>
  );
}
