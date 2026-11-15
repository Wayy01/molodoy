"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ListChecks, Plus } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { LevelBadge } from "@/components/ui/badge";
import { cn, t9n } from "@/lib/utils";
import { addDays, dateKey, hhmm, minutesOf, timeKey, weekday } from "@/lib/time";
import type { OpsAppointment, OpsBarber, OpsTimeOff } from "@/lib/dashboard/ops/types";
import { useNow } from "./use-now";

/** Pixels per 30-minute row. */
export const ROW = 52;
const PX_PER_MIN = ROW / 30;
const TIME_COL = 64;
const MIN_COL = { day: 172, week: 136 } as const;

export type Axis = { start: number; end: number };

export const STATUS_BLOCK = {
  booked: "bg-accent-soft border-l-accent",
  completed: "bg-success/12 border-l-success",
  no_show: "bg-warning/12 border-l-warning",
  cancelled: "bg-surface-2 border-l-line-strong text-muted",
} as const;

export const HATCH = "bg-[repeating-linear-gradient(135deg,var(--surface-2)_0_6px,transparent_6px_12px)]";

/** The barber's hours that day, clipped to the branch's opening hours. null = day off. */
export function workWindow(barber: OpsBarber, date: string, axis: Axis) {
  const hours = barber.workingHours[weekday(date)];
  if (!hours) return null;
  const start = Math.max(minutesOf(hours.start), axis.start);
  const end = Math.min(minutesOf(hours.end), axis.end);
  return end > start ? { start, end } : null;
}

/** Minutes since local midnight of `date`, clamped to the axis. */
function clampMinutes(at: Date, date: string, axis: Axis) {
  const key = dateKey(at);
  if (key < date) return axis.start;
  if (key > date) return axis.end;
  return Math.min(axis.end, Math.max(axis.start, minutesOf(timeKey(at))));
}

type ColumnHandlers = {
  onSlot: (barberId: number, date: string, time: string) => void;
  onOpen: (id: string) => void;
  onTimeOff?: (barberId: number) => void;
};

export function CalendarGrid({
  axis,
  columns,
  header,
  today,
  density = "day",
  ...handlers
}: {
  axis: Axis;
  /** Week columns are narrower so a whole week fits a laptop screen. */
  density?: keyof typeof MIN_COL;
  columns: Array<{ key: string; date: string; barber: OpsBarber; appointments: OpsAppointment[]; timeOff: OpsTimeOff[]; header: ReactNode }>;
  header?: ReactNode;
  today: string;
} & ColumnHandlers) {
  const scroller = useRef<HTMLDivElement>(null);
  const now = useNow();
  const rows = (axis.end - axis.start) / 30;
  const height = rows * ROW;
  const showsToday = columns.some((c) => c.date === today);
  const nowMin = now !== null && showsToday ? minutesOf(timeKey(now)) : null;
  const nowVisible = nowMin !== null && nowMin >= axis.start && nowMin <= axis.end;

  useEffect(() => {
    const el = scroller.current;
    if (!el || !showsToday) return;
    const minutes = minutesOf(timeKey(Date.now()));
    el.scrollTop = Math.max(0, (minutes - axis.start) * PX_PER_MIN - 120);
  }, [showsToday, axis.start]);

  // The grid is sized to the screen; scrolling inside it first brings the whole grid into view,
  // so its header row and bottom edge are never cut off while browsing hours.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const fitTarget = () => {
      const gap = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const target = Math.min(max, Math.max(0, window.scrollY + el.getBoundingClientRect().top - gap));
      return Math.abs(target - window.scrollY) < 2 ? null : target;
    };
    const fit = (top: number) =>
      window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.shiftKey || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const up = e.deltaY < 0;
      // Scrolling up past the first hour hands over to the page, so the toolbar stays reachable.
      if (up && el.scrollTop <= 0) return;
      const target = fitTarget();
      if (target !== null) {
        e.preventDefault();
        fit(target);
      } else if (!up && el.scrollTop + el.clientHeight >= el.scrollHeight - 1) {
        // Past the last hour the page would creep on and slide the header row under the top bar.
        e.preventDefault();
      }
    };
    const onTouch = () => {
      const target = fitTarget();
      if (target !== null) fit(target);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouch);
    };
  }, []);

  return (
    <div
      ref={scroller}
      className="relative max-h-[calc(100dvh-var(--dash-top)-var(--dash-bottom)-1.5rem)] scroll-mt-[calc(var(--dash-top)+0.75rem)] overflow-auto overscroll-x-contain rounded-2xl border border-line bg-surface"
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${TIME_COL}px repeat(${columns.length}, minmax(${MIN_COL[density]}px, 1fr))`,
          minWidth: TIME_COL + columns.length * MIN_COL[density],
        }}
      >
        <div className="sticky top-0 left-0 z-30 border-r border-b border-line bg-surface">{header}</div>
        {columns.map((c) => (
          <div key={c.key} className="sticky top-0 z-20 border-b border-l border-line bg-surface">
            {c.header}
          </div>
        ))}

        <div className="sticky left-0 z-10 border-r border-line bg-surface" style={{ height }}>
          {Array.from({ length: rows }, (_, i) => {
            const m = axis.start + i * 30;
            return (
              <div
                key={m}
                className={cn("tabular absolute right-2 -translate-y-1/2 text-[11px]", m % 60 ? "text-subtle" : "font-medium text-muted")}
                style={{ top: i * ROW }}
              >
                {i === 0 || (nowVisible && Math.abs(m - nowMin!) < 12) ? null : hhmm(m)}
              </div>
            );
          })}
          {nowVisible ? (
            <div
              className="tabular absolute right-1 z-10 -translate-y-1/2 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-fg"
              style={{ top: (nowMin! - axis.start) * PX_PER_MIN }}
            >
              {hhmm(nowMin!)}
            </div>
          ) : null}
        </div>

        {columns.map((c) => (
          <Column
            key={c.key}
            date={c.date}
            barber={c.barber}
            appointments={c.appointments}
            timeOff={c.timeOff}
            {...handlers}
            axis={axis}
            height={height}
            nowMin={c.date === today && nowVisible ? nowMin : null}
            past={c.date < today}
          />
        ))}
      </div>
    </div>
  );
}

function Column({
  date,
  barber,
  appointments,
  timeOff,
  axis,
  height,
  nowMin,
  past,
  onSlot,
  onOpen,
  onTimeOff,
}: {
  date: string;
  barber: OpsBarber;
  appointments: OpsAppointment[];
  timeOff: OpsTimeOff[];
  axis: Axis;
  height: number;
  nowMin: number | null;
  past: boolean;
} & ColumnHandlers) {
  const t = useTranslations("dashOps.calendar");
  const locale = useLocale();
  const win = workWindow(barber, date, axis);
  const y = (m: number) => (m - axis.start) * PX_PER_MIN;

  const offs = timeOff
    .filter((o) => o.barberId === barber.id && dateKey(o.startsAt) <= date && dateKey(new Date(o.endsAt.getTime() - 1)) >= date)
    .map((o) => ({ ...o, from: clampMinutes(o.startsAt, date, axis), to: clampMinutes(o.endsAt, date, axis) }))
    .filter((o) => o.to > o.from);

  const cancelled = appointments.filter((a) => a.status === "cancelled");
  const overlapsCancelled = (a: OpsAppointment) => cancelled.some((c) => c.startsAt < a.endsAt && c.endsAt > a.startsAt);

  return (
    <div
      className="relative border-l border-line"
      style={{
        height,
        backgroundImage: "linear-gradient(to bottom, var(--line) 1px, transparent 1px)",
        backgroundSize: `100% ${ROW}px`,
      }}
    >
      {win ? (
        <>
          {win.start > axis.start ? <div className={cn("absolute inset-x-0 top-0", HATCH)} style={{ height: y(win.start) }} /> : null}
          {win.end < axis.end ? <div className={cn("absolute inset-x-0 bottom-0", HATCH)} style={{ top: y(win.end) }} /> : null}
          {past
            ? null
            : Array.from({ length: (win.end - win.start) / 30 }, (_, i) => {
                const m = win.start + i * 30;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSlot(barber.id, date, hhmm(m))}
                    aria-label={t("newAt", { time: hhmm(m), name: barber.name })}
                    className="group absolute inset-x-0 flex items-center justify-center text-subtle opacity-0 transition-opacity hover:bg-surface-2/70 hover:opacity-100 focus-visible:opacity-100"
                    style={{ top: y(m), height: ROW }}
                  >
                    <Plus size={16} />
                  </button>
                );
              })}
        </>
      ) : (
        <div className={cn("absolute inset-0 flex items-start justify-center pt-6", HATCH)}>
          <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">{t("dayOff")}</span>
        </div>
      )}

      {offs.map((o) => (
        <button
          key={o.id}
          type="button"
          disabled={!onTimeOff}
          onClick={() => onTimeOff?.(barber.id)}
          className="absolute inset-x-1 z-[2] overflow-hidden rounded-lg border border-dashed border-line-strong bg-[repeating-linear-gradient(135deg,var(--surface-3)_0_5px,var(--surface-2)_5px_10px)] px-2 py-1 text-left text-[11px] text-muted disabled:cursor-default"
          style={{ top: y(o.from) + 1, height: Math.max(20, y(o.to) - y(o.from) - 2) }}
        >
          <span className="font-medium text-fg">{t("blocked")}</span>
          {o.reason ? <span className="block truncate">{o.reason}</span> : null}
        </button>
      ))}

      {appointments.map((a) => {
        const from = clampMinutes(a.startsAt, date, axis);
        const to = clampMinutes(a.endsAt, date, axis);
        const h = Math.max(24, y(to) - y(from) - 2);
        const isCancelled = a.status === "cancelled";
        const split = !isCancelled && overlapsCancelled(a);
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpen(a.id)}
            className={cn(
              "absolute z-[3] flex flex-col overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left transition-[filter] hover:brightness-110 focus-visible:z-[4]",
              STATUS_BLOCK[a.status],
              isCancelled ? "right-1 left-[58%] z-[2] opacity-80" : split ? "right-[44%] left-1" : "inset-x-1",
            )}
            style={{ top: y(from) + 1, height: h }}
          >
            <span className={cn("tabular text-[11px] leading-tight text-muted", isCancelled && "line-through")}>
              {timeKey(a.startsAt)}-{timeKey(a.endsAt)}
            </span>
            <span className={cn("truncate text-[13px] leading-tight font-medium", isCancelled && "line-through")}>{a.client.name}</span>
            {h >= 46 ? <span className="truncate text-[11px] leading-tight text-muted">{t9n(a.service.name, locale)}</span> : null}
          </button>
        );
      })}

      {nowMin !== null ? (
        <div className="pointer-events-none absolute inset-x-0 z-[5] h-0.5 bg-accent" style={{ top: y(nowMin) }}>
          <span className="absolute -top-[3px] -left-[4px] size-2 rounded-full bg-accent" />
        </div>
      ) : null}
    </div>
  );
}

export function BarberHeader({ barber, count, onClick, active }: { barber: OpsBarber; count: number; onClick?: () => void; active?: boolean }) {
  const t = useTranslations("dashOps.calendar");
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-16 w-full items-center gap-2.5 px-3 text-left hover:bg-surface-2", active && "bg-accent-soft")}
      title={t("openWeek")}
    >
      <Avatar src={barber.photo} name={barber.name} size={34} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{barber.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <LevelBadge level={barber.level} className="h-5 px-2" />
          <Count value={count} label={t("count", { count })} />
        </span>
      </span>
    </button>
  );
}

export function DayHeader({ date, today, label, count, onClick }: { date: string; today: string; label: string; count: number; onClick: () => void }) {
  const t = useTranslations("dashOps.calendar");
  const isToday = date === today;
  return (
    <button type="button" onClick={onClick} className="flex h-16 w-full flex-col items-start justify-center px-3 text-left hover:bg-surface-2">
      <span className={cn("text-xs font-medium tracking-wide uppercase", isToday ? "text-accent" : "text-muted")}>{label}</span>
      <span className="flex items-baseline gap-2">
        <span className={cn("font-display text-lg font-semibold", isToday && "text-accent")}>{Number(date.slice(8))}</span>
        <Count value={count} label={t("count", { count })} />
      </span>
    </button>
  );
}

function Count({ value, label }: { value: number; label: string }) {
  return (
    <span className="tabular inline-flex items-center gap-1 text-xs text-muted" title={label}>
      <ListChecks size={12} aria-hidden />
      <span aria-hidden>{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}
