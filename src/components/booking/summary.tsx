"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { LevelBadge } from "@/components/ui/badge";
import { formatMDL, t9n } from "@/lib/utils";
import type { BookingBarber, BookingLocation, BookingService, Step } from "./types";
import { useWhenLabel } from "./use-when-label";

export function Summary({
  location,
  barber,
  service,
  date,
  time,
  price,
  onEdit,
}: {
  location?: BookingLocation;
  barber?: BookingBarber;
  service?: BookingService;
  date?: string;
  time?: string;
  price: number | null;
  onEdit: (step: Step) => void;
}) {
  const t = useTranslations("booking");
  const locale = useLocale();
  const when = useWhenLabel();

  const rows: Array<{ step: Step; label: string; value: React.ReactNode }> = [
    { step: "location", label: t("summary.location"), value: location ? t9n(location.name, locale) : null },
    {
      step: "barber",
      label: t("summary.barber"),
      value: barber ? (
        <span className="flex items-center gap-2">
          {barber.photo && (
            <span className="relative h-6 w-6 overflow-hidden rounded-full">
              <Image src={barber.photo} alt="" fill sizes="24px" className="object-cover" />
            </span>
          )}
          {barber.name}
          <LevelBadge level={barber.level} />
        </span>
      ) : null,
    },
    {
      step: "service",
      label: t("summary.service"),
      value: service ? (
        <span>
          {t9n(service.name, locale)}
          <span className="block text-xs text-muted">{t("summary.duration", { count: service.durationMin })}</span>
        </span>
      ) : null,
    },
    { step: "time", label: t("summary.when"), value: date && time ? when(date, time) : null },
  ];

  return (
    <div className="rounded-2xl border border-line bg-surface p-5">
      <p className="mb-4 font-display text-sm font-semibold tracking-tight">{t("summary.title")}</p>
      <dl className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.step} className="grid grid-cols-[88px_1fr_auto] items-start gap-3 text-sm">
            <dt className="text-muted">{r.label}</dt>
            <dd className="min-w-0 font-medium">{r.value ?? <span className="text-subtle">-</span>}</dd>
            {r.value ? (
              <button type="button" onClick={() => onEdit(r.step)} className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline">
                {t("nav.change")}
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
        <span className="text-sm text-muted">{t("summary.total")}</span>
        <span className="tabular font-display text-2xl font-semibold">{price != null ? formatMDL(price, locale) : "-"}</span>
      </div>
    </div>
  );
}
