"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { LevelBadge } from "@/components/ui/badge";
import { cn, formatMDL } from "@/lib/utils";
import type { BookingBarber } from "./types";
import { useWhenLabel } from "./use-when-label";

type NextFree = Record<number, { date: string; time: string } | null>;

export function StepBarber({
  barbers,
  locationId,
  fromPrice,
  value,
  onPick,
}: {
  barbers: BookingBarber[];
  locationId: number;
  fromPrice: (b: BookingBarber) => number | null;
  value?: number;
  onPick: (id: number) => void;
}) {
  const t = useTranslations("booking.barber");
  const locale = useLocale();
  const when = useWhenLabel();
  const [loaded, setLoaded] = useState<{ locationId: number; data: NextFree } | null>(null);
  const next = loaded?.locationId === locationId ? loaded.data : null;

  useEffect(() => {
    let alive = true;
    fetch(`/api/availability/next?location=${locationId}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: NextFree) => alive && setLoaded({ locationId, data }))
      .catch(() => alive && setLoaded({ locationId, data: {} }));
    return () => {
      alive = false;
    };
  }, [locationId]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {barbers.map((b) => {
        const free = next?.[b.id];
        const price = fromPrice(b);
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onPick(b.id)}
            className={cn(
              "group overflow-hidden rounded-2xl border bg-surface text-left transition-[border-color,scale] duration-300 active:scale-[0.98]",
              value === b.id ? "border-accent ring-2 ring-accent/30" : "border-line hover:border-line-strong",
            )}
          >
            <div className="relative aspect-[4/5] bg-surface-3">
              {b.photo ? (
                <Image src={b.photo} alt={b.name} fill sizes="(min-width: 640px) 220px, 45vw" className="object-cover object-[center_30%] transition-transform duration-700 group-hover:scale-[1.04]" />
              ) : (
                <span className="display absolute inset-0 flex items-center justify-center text-6xl text-fg/15">{b.name[0]}</span>
              )}
              <LevelBadge level={b.level} className="absolute top-2.5 left-2.5 bg-bg/70 backdrop-blur-md" />
            </div>
            <div className="p-3 sm:p-4">
              <p className="font-display text-base font-semibold tracking-tight sm:text-lg">{b.name}</p>
              {price != null && <p className="tabular text-sm text-muted">{t("fromPrice", { price: formatMDL(price, locale) })}</p>}
              <p className={cn("tabular mt-2 text-xs", free ? "text-success" : "text-subtle")}>
                {next === null ? (
                  <span className="skeleton inline-block h-3 w-20 rounded" />
                ) : free ? (
                  t("nextFree", { when: when(free.date, free.time) })
                ) : (
                  t("noFree")
                )}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
