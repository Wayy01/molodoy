"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getFreeSlots } from "@/lib/dashboard/ops/actions";

/** Free start times for barber + service + day, fetched with the same rules the public booking uses. */
export function SlotPicker({
  barberId,
  serviceId,
  date,
  excludeAppointmentId,
  value,
  onChange,
  invalid,
}: {
  barberId: number | null;
  serviceId: number | null;
  date: string;
  excludeAppointmentId?: string;
  value: string | null;
  onChange: (time: string | null) => void;
  invalid?: boolean;
}) {
  const t = useTranslations("dashOps.slots");
  const key = `${barberId}|${serviceId}|${date}|${excludeAppointmentId ?? ""}`;
  const ready = !!barberId && !!serviceId && !!date;
  const [state, setState] = useState<{ key: string; open: boolean; slots: string[] } | null>(null);

  useEffect(() => {
    if (!barberId || !serviceId || !date) return;
    let live = true;
    getFreeSlots({ barberId, serviceId, date, excludeAppointmentId }).then((r) => {
      if (!live) return;
      setState({ key, ...r });
      if (value && !r.slots.includes(value)) onChange(null);
    });
    return () => {
      live = false;
    };
    // `value`/`onChange` only matter at the moment fresh slots arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!ready) return <p className="text-sm text-muted">{t("pickFirst")}</p>;
  if (state?.key !== key) {
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-busy>
        {Array.from({ length: 12 }, (_, i) => (
          <Skeleton key={i} className="h-11 rounded-full" />
        ))}
      </div>
    );
  }
  if (!state.open) return <p className="text-sm text-muted">{t("dayOff")}</p>;
  if (state.slots.length === 0) return <p className="text-sm text-muted">{t("none")}</p>;

  return (
    <div role="radiogroup" aria-label={t("label")} aria-invalid={invalid} className="grid grid-cols-4 gap-2 sm:grid-cols-6">
      {state.slots.map((slot) => (
        <button
          key={slot}
          type="button"
          role="radio"
          aria-checked={slot === value}
          onClick={() => onChange(slot)}
          className={cn(
            "tabular h-11 rounded-full border text-sm font-medium transition-colors",
            slot === value ? "border-accent bg-accent text-accent-fg" : "border-line-strong hover:bg-surface-2",
            invalid && slot !== value && "border-danger/40",
          )}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
