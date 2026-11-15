"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useWhenLabel } from "@/components/booking/use-when-label";

type Day = { date: string; open: boolean; slots: string[] };

/** The barber's next few free slots; tapping one jumps straight to the details step of booking. */
export function NextSlots({ barberId, barberSlug, serviceId, serviceSlug }: { barberId: number; barberSlug: string; serviceId: number; serviceSlug: string }) {
  const t = useTranslations("site.barberPage");
  const when = useWhenLabel();
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    fetch(`/api/availability?barber=${barberId}&service=${serviceId}`)
      .then((r) => (r.ok ? r.json() : { days: [] }))
      .then((d: { days: Day[] }) => setDays(d.days))
      .catch(() => setDays([]));
  }, [barberId, serviceId]);

  if (!days) {
    return (
      <div className="flex flex-wrap gap-2" aria-label={t("loading")}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-11 w-32 rounded-full" />
        ))}
      </div>
    );
  }

  const slots = days.flatMap((d) => d.slots.map((s) => ({ date: d.date, time: s }))).slice(0, 8);
  if (!slots.length) return <p className="text-muted">{t("noSlots")}</p>;

  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((s) => (
        <Link
          key={`${s.date}-${s.time}`}
          href={`/book?barber=${barberSlug}&service=${serviceSlug}&date=${s.date}&time=${s.time}&step=details`}
          className="tabular inline-flex h-11 items-center rounded-full border border-line-strong px-4 text-sm font-medium transition-colors hover:border-accent hover:bg-accent hover:text-accent-fg"
        >
          {when(s.date, s.time)}
        </Link>
      ))}
    </div>
  );
}
