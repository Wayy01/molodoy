"use client";

import { useLocale, useTranslations } from "next-intl";
import { Clock } from "@phosphor-icons/react";
import { cn, formatMDL, t9n } from "@/lib/utils";
import type { BarberLevel } from "@/db/schema";
import type { BookingService } from "./types";

export function StepService({
  services,
  level,
  value,
  onPick,
}: {
  services: BookingService[];
  level: BarberLevel;
  value?: number;
  onPick: (id: number) => void;
}) {
  const locale = useLocale();
  const tc = useTranslations("common");
  const offered = services.filter((s) => s.prices[level] != null);

  return (
    <div className="flex flex-col gap-2.5">
      {offered.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s.id)}
          className={cn(
            "flex items-center gap-4 rounded-2xl border bg-surface p-4 text-left transition-colors duration-200 sm:p-5",
            value === s.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong hover:bg-surface-2",
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{t9n(s.name, locale)}</p>
            {s.description && <p className="mt-0.5 text-sm text-muted">{t9n(s.description, locale)}</p>}
            <p className="tabular mt-2 flex items-center gap-1.5 text-xs text-subtle">
              <Clock size={13} /> {tc("time.min", { count: s.durationMin })}
              <span className="text-line-strong">/</span>
              {tc(`categories.${s.category}`)}
            </p>
          </div>
          <p className="tabular shrink-0 font-display text-lg font-medium">{formatMDL(s.prices[level]!, locale)}</p>
        </button>
      ))}
    </div>
  );
}
