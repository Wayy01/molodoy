"use client";

import { useLocale, useTranslations } from "next-intl";
import { Plus, Prohibit } from "@phosphor-icons/react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, formatMDL, t9n } from "@/lib/utils";
import { dateKey, hhmm, minutesOf, timeKey } from "@/lib/time";
import type { OpsAppointment, OpsBarber, OpsTimeOff } from "@/lib/dashboard/ops/types";
import { STATUS_BLOCK, workWindow, type Axis } from "./calendar-grid";
import { StatusBadge } from "./status-badge";
import { useNow } from "./use-now";

type Item =
  | { kind: "appt"; at: number; appt: OpsAppointment }
  | { kind: "off"; at: number; end: number; off: OpsTimeOff }
  | { kind: "gap"; at: number; end: number };

/** Phone layout: one barber, one day, as a list with the free gaps between visits. */
export function Agenda({
  barber,
  date,
  today,
  axis,
  appointments,
  timeOff,
  onOpen,
  onNew,
  onTimeOff,
}: {
  barber: OpsBarber;
  date: string;
  today: string;
  axis: Axis;
  appointments: OpsAppointment[];
  timeOff: OpsTimeOff[];
  onOpen: (id: string) => void;
  onNew: (time: string) => void;
  onTimeOff?: () => void;
}) {
  const t = useTranslations("dashOps.calendar");
  const locale = useLocale();
  const now = useNow();
  const win = workWindow(barber, date, axis);

  const mins = (d: Date, fallback: number) => {
    const key = dateKey(d);
    return key < date ? axis.start : key > date ? fallback : minutesOf(timeKey(d));
  };

  const offs = timeOff
    .filter((o) => o.barberId === barber.id && dateKey(o.startsAt) <= date && dateKey(new Date(o.endsAt.getTime() - 1)) >= date)
    .map((o) => ({ kind: "off" as const, at: mins(o.startsAt, axis.end), end: mins(o.endsAt, axis.end), off: o }));

  const items: Item[] = [...appointments.map((a) => ({ kind: "appt" as const, at: minutesOf(timeKey(a.startsAt)), appt: a })), ...offs];

  // Free gaps only where a booking could still go: inside working hours and not already behind us.
  if (win && date >= today) {
    const floor = date === today && now !== null ? Math.ceil(minutesOf(timeKey(now)) / 30) * 30 : win.start;
    const busy = [
      ...appointments.filter((a) => a.status !== "cancelled").map((a) => [minutesOf(timeKey(a.startsAt)), minutesOf(timeKey(a.endsAt))]),
      ...offs.map((o) => [o.at, o.end]),
    ].sort((x, y) => x[0] - y[0]);
    let cursor = Math.max(win.start, floor);
    for (const [s, e] of busy) {
      if (s - cursor >= 30) items.push({ kind: "gap", at: cursor, end: Math.min(s, win.end) });
      cursor = Math.max(cursor, e);
    }
    if (win.end - cursor >= 30) items.push({ kind: "gap", at: cursor, end: win.end });
  }
  items.sort((x, y) => x.at - y.at || (x.kind === "gap" ? 1 : -1));

  if (!win && appointments.length === 0) {
    return <EmptyState icon={<Prohibit />} title={t("dayOff")} description={t("dayOffHint", { name: barber.name })} />;
  }
  if (items.length === 0) {
    return <EmptyState title={t("emptyDay")} description={date < today ? undefined : t("emptyDayHint")} />;
  }

  return (
    <ol className="flex flex-col gap-2 pb-12">
      {items.map((item) => {
        if (item.kind === "gap") {
          return (
            <li key={`gap-${item.at}`}>
              <button
                type="button"
                onClick={() => onNew(hhmm(item.at))}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line-strong px-4 py-2.5 text-left text-sm text-muted hover:bg-surface-2"
              >
                <span>
                  <span className="font-medium text-fg">{t("free")}</span>
                  <span className="tabular"> · {hhmm(item.at)}-{hhmm(item.end)}</span>
                </span>
                <Plus size={18} className="text-accent" />
              </button>
            </li>
          );
        }
        if (item.kind === "off") {
          return (
            <li key={`off-${item.off.id}`}>
              <button
                type="button"
                disabled={!onTimeOff}
                onClick={onTimeOff}
                className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-line bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_5px,var(--surface-2)_5px_10px)] px-4 py-2.5 text-left text-sm disabled:cursor-default"
              >
                <span className="min-w-0">
                  <span className="font-medium">{t("blocked")}</span>
                  <span className="tabular text-muted">
                    {" "}
                    · {hhmm(item.at)}-{hhmm(item.end)}
                  </span>
                  {item.off.reason ? <span className="block truncate text-muted">{item.off.reason}</span> : null}
                </span>
              </button>
            </li>
          );
        }
        const a = item.appt;
        return (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onOpen(a.id)}
              className={cn(
                "flex w-full items-stretch gap-3 rounded-2xl border border-line border-l-[3px] px-4 py-3 text-left",
                STATUS_BLOCK[a.status],
              )}
            >
              <span className="tabular flex w-12 shrink-0 flex-col pt-0.5">
                <span className="text-sm font-semibold">{timeKey(a.startsAt)}</span>
                <span className="text-xs text-muted">{timeKey(a.endsAt)}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate font-medium", a.status === "cancelled" && "line-through")}>{a.client.name}</span>
                <span className="block truncate text-sm text-muted">{t9n(a.service.name, locale)}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end justify-between gap-1">
                <StatusBadge status={a.status} />
                <span className="tabular text-sm text-muted">{formatMDL(a.price, locale)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
