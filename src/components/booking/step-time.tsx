"use client";

import { useEffect, useRef, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Moon, SunHorizon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DayAvailability } from "@/lib/slots";

const GROUPS = [
  { key: "morning", icon: SunHorizon, test: (h: number) => h < 12 },
  { key: "afternoon", icon: Sun, test: (h: number) => h >= 12 && h < 17 },
  { key: "evening", icon: Moon, test: (h: number) => h >= 17 },
] as const;

export function StepTime({
  barberId,
  barberName,
  serviceId,
  date,
  time,
  refreshKey,
  onPick,
}: {
  barberId: number;
  barberName: string;
  serviceId: number;
  date?: string;
  time?: string;
  refreshKey: number;
  onPick: (date: string, time: string) => void;
}) {
  const t = useTranslations("booking.time");
  const format = useFormatter();
  const [retry, setRetry] = useState(0);
  const requestKey = `${barberId}:${serviceId}:${refreshKey}:${retry}`;
  const [result, setResult] = useState<{ key: string; days: DayAvailability[] | null; failed: boolean } | null>(null);
  const current = result?.key === requestKey ? result : null;
  const days = current?.days ?? null;
  const failed = current?.failed ?? false;
  const [picked, setPicked] = useState<string | undefined>(date);
  const strip = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/availability?barber=${barberId}&service=${serviceId}`, { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<{ days: DayAvailability[] }>;
      })
      .then(({ days }) => alive && setResult({ key: requestKey, days, failed: false }))
      .catch(() => alive && setResult({ key: requestKey, days: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [barberId, serviceId, requestKey]);

  // Keep the chosen day if it still has slots, otherwise jump to the first day that does.
  const active =
    days && picked && days.some((d) => d.date === picked && d.slots.length)
      ? picked
      : (days?.find((d) => d.slots.length)?.date ?? days?.[0]?.date);

  useEffect(() => {
    strip.current?.querySelector<HTMLElement>("[aria-pressed=true]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active, days]);

  if (failed) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <p className="text-muted">{t("error")}</p>
        <Button variant="secondary" className="mt-4" onClick={() => setRetry((n) => n + 1)}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const day = days?.find((d) => d.date === active);

  return (
    <div>
      <div ref={strip} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {(days ?? Array.from({ length: 10 }, () => null)).map((d, i) => {
          if (!d) return <div key={i} className="skeleton h-[76px] w-[60px] shrink-0 rounded-2xl" />;
          const dt = new Date(`${d.date}T12:00:00Z`);
          const disabled = d.slots.length === 0;
          return (
            <button
              key={d.date}
              type="button"
              aria-pressed={active === d.date}
              disabled={disabled}
              onClick={() => setPicked(d.date)}
              className={cn(
                "flex h-[76px] w-[60px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border transition-colors",
                active === d.date
                  ? "border-fg bg-fg text-bg"
                  : disabled
                    ? "border-transparent text-subtle/60"
                    : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className="text-[11px] uppercase">{format.dateTime(dt, { weekday: "short", timeZone: "UTC" })}</span>
              <span className={cn("tabular font-display text-lg font-semibold", disabled && "line-through decoration-1")}>{dt.getUTCDate()}</span>
            </button>
          );
        })}
      </div>

      {day && (
        <p className="mt-5 text-sm text-muted">
          {format.dateTime(new Date(`${day.date}T12:00:00Z`), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-6">
        {!days ? (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton h-12 rounded-full" />
            ))}
          </div>
        ) : !day || !day.open ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">{t("dayOff", { name: barberName })}</p>
        ) : day.slots.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong p-6 text-center text-muted">{t("full")}</p>
        ) : (
          GROUPS.map((g) => {
            const slots = day.slots.filter((s) => g.test(Number(s.slice(0, 2))));
            if (!slots.length) return null;
            return (
              <div key={g.key}>
                <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
                  <g.icon size={16} /> {t(g.key)}
                </p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {slots.map((s) => {
                    const selected = date === day.date && time === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => onPick(day.date, s)}
                        aria-pressed={selected}
                        className={cn(
                          "tabular h-12 rounded-full border text-[0.9375rem] font-medium transition-[background-color,border-color,scale] duration-200 active:scale-95",
                          selected ? "border-accent bg-accent text-accent-fg" : "border-line bg-surface hover:border-fg",
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
