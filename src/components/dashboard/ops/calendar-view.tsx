"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { CalendarSlash, CaretLeft, CaretRight, Plus } from "@phosphor-icons/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn, t9n } from "@/lib/utils";
import { addDays, dateKey, minutesOf, weekday, zoned } from "@/lib/time";
import type { Localized } from "@/db/schema";
import type { CalendarData, CalendarView as View } from "@/lib/dashboard/ops/queries";
import { AppointmentDialog } from "./appointment-dialog";
import { NewAppointmentDialog, type NewAppointmentPrefill } from "./new-appointment-dialog";
import { TimeOffDialog } from "./time-off-dialog";
import { Agenda } from "./agenda";
import { BarberHeader, CalendarGrid, DayHeader, weekDates, type Axis } from "./calendar-grid";

export function CalendarView({
  data,
  date,
  today,
  view,
  showCancelled,
  location,
  branches,
  openNew,
  canManageTimeOff,
}: {
  data: CalendarData;
  date: string;
  today: string;
  view: View;
  showCancelled: boolean;
  location: { id: number; opensAt: string; closesAt: string };
  /** Branch chips, only for owners looking at all branches. */
  branches: Array<{ id: number; name: Localized }> | null;
  openNew: boolean;
  canManageTimeOff: boolean;
}) {
  const t = useTranslations("dashOps.calendar");
  const tNav = useTranslations("dashboard.nav");
  const tDays = useTranslations("common.weekdays");
  const tTime = useTranslations("common.time");
  const locale = useLocale();
  const format = useFormatter();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();

  const shortDays = tDays.raw("short") as string[];
  const axis: Axis = {
    start: Math.floor(minutesOf(location.opensAt) / 60) * 60,
    end: Math.ceil(minutesOf(location.closesAt) / 60) * 60,
  };
  const barber = data.barbers.find((b) => b.id === data.barberId) ?? null;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [prefill, setPrefill] = useState<NewAppointmentPrefill | null>(() =>
    openNew ? { barberId: data.barberId, date, time: null } : null,
  );
  const [timeOffFor, setTimeOffFor] = useState<number | null | undefined>(undefined);

  const navigate = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(search.toString());
    next.delete("new");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    start(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  const closeNew = () => {
    setPrefill(null);
    if (search.has("new")) {
      const next = new URLSearchParams(search.toString());
      next.delete("new");
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    }
  };

  const all = [...data.day, ...data.week];
  const selected = selectedId ? all.find((a) => a.id === selectedId) : undefined;
  const countFor = (barberId: number, day: string) => data.counts.find((c) => c.barberId === barberId && c.day === day)?.n ?? 0;
  const dayLabel = (d: string) => format.dateTime(zoned(d, "12:00"), { weekday: "long", day: "numeric", month: "long" });
  const relative = date === today ? tTime("today") : date === addDays(today, 1) ? tTime("tomorrow") : null;
  const step = view === "week" ? 7 : 1;

  const header = (
    <PageHeader
      title={tNav("calendar")}
      description={
        <span className="first-letter:uppercase">
          {relative ? `${relative}, ` : ""}
          {dayLabel(date)}
        </span>
      }
      actions={
        <div className="hidden items-center gap-2 md:flex">
          {canManageTimeOff ? (
            <Button variant="secondary" onClick={() => setTimeOffFor(barber?.id ?? data.barbers[0]?.id ?? null)}>
              <CalendarSlash size={18} />
              {t("timeOff")}
            </Button>
          ) : null}
          <Button onClick={() => setPrefill({ barberId: data.barberId, date, time: null })} disabled={!data.barbers.length}>
            <Plus size={18} weight="bold" />
            {t("new")}
          </Button>
        </div>
      }
      className="mb-4"
    />
  );

  const branchChips = branches ? (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {branches.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => navigate({ loc: String(b.id), barber: null })}
          aria-pressed={b.id === location.id}
          className={cn(
            "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors md:h-9",
            b.id === location.id ? "border-fg bg-fg text-bg" : "border-line-strong hover:bg-surface-2",
          )}
        >
          {t9n(b.name, locale)}
        </button>
      ))}
    </div>
  ) : null;

  const cancelledToggle = (
    <label className="inline-flex h-11 cursor-pointer items-center gap-2.5 rounded-full border border-line-strong px-4 text-sm md:h-9">
      <input
        type="checkbox"
        checked={showCancelled}
        onChange={(e) => navigate({ cancelled: e.target.checked ? "1" : null })}
        className="size-4 accent-[var(--accent)]"
      />
      {t("showCancelled")}
    </label>
  );

  if (!data.barbers.length) {
    return (
      <>
        {header}
        {branchChips}
        <EmptyState title={t("noBarbers")} description={t("noBarbersHint")} />
      </>
    );
  }

  const days = weekDates(data.weekStart);

  return (
    <div className={cn("transition-opacity", pending && "opacity-60")}>
      {header}
      {branchChips}

      {/* Desktop toolbar */}
      <div className="mb-4 hidden flex-wrap items-center gap-2 md:flex">
        <div className="flex items-center rounded-full border border-line-strong">
          <button
            type="button"
            onClick={() => navigate({ date: addDays(date, -step) })}
            className="flex size-9 items-center justify-center rounded-full hover:bg-surface-2"
            aria-label={t("prev")}
          >
            <CaretLeft size={16} />
          </button>
          <button type="button" onClick={() => navigate({ date: null })} className="h-9 px-3 text-sm font-medium hover:bg-surface-2">
            {tTime("today")}
          </button>
          <button
            type="button"
            onClick={() => navigate({ date: addDays(date, step) })}
            className="flex size-9 items-center justify-center rounded-full hover:bg-surface-2"
            aria-label={t("next")}
          >
            <CaretRight size={16} />
          </button>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && navigate({ date: e.target.value })}
          aria-label={t("pickDate")}
          className="tabular h-9 rounded-full border border-line-strong bg-surface px-3.5 text-sm outline-none focus:border-accent"
        />
        <div role="radiogroup" aria-label={t("view")} className="flex rounded-full border border-line bg-surface-2 p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={view === v}
              onClick={() => navigate({ view: v === "day" ? null : "week" })}
              className={cn(
                "h-8 rounded-full px-3.5 text-sm font-medium transition-colors",
                view === v ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
              )}
            >
              {t(`views.${v}`)}
            </button>
          ))}
        </div>
        <div className="ml-auto">{cancelledToggle}</div>
      </div>

      {view === "week" && data.barbers.length > 1 ? (
        <div className="no-scrollbar mb-4 hidden gap-2 overflow-x-auto md:flex">
          {data.barbers.map((b) => (
            <BarberChip key={b.id} name={b.name} photo={b.photo} active={b.id === data.barberId} onClick={() => navigate({ barber: String(b.id) })} />
          ))}
        </div>
      ) : null}

      <div className="hidden md:block">
        {view === "day" ? (
          <CalendarGrid
            axis={axis}
            today={today}
            columns={data.barbers.map((b) => ({
              key: String(b.id),
              date,
              barber: b,
              appointments: data.day.filter((a) => a.barber.id === b.id),
              timeOff: data.timeOff,
              header: (
                <BarberHeader
                  barber={b}
                  count={countFor(b.id, date)}
                  onClick={() => navigate({ view: "week", barber: String(b.id) })}
                />
              ),
            }))}
            onSlot={(barberId, d, time) => setPrefill({ barberId, date: d, time })}
            onOpen={setSelectedId}
            onTimeOff={canManageTimeOff ? (id) => setTimeOffFor(id) : undefined}
          />
        ) : barber ? (
          <CalendarGrid
            axis={axis}
            today={today}
            density="week"
            header={
              <div className="flex h-16 items-center justify-center">
                <Avatar src={barber.photo} name={barber.name} size={30} />
              </div>
            }
            columns={days.map((d) => ({
              key: d,
              date: d,
              barber,
              appointments: data.week.filter((a) => dateKey(a.startsAt) === d),
              timeOff: data.timeOff,
              header: (
                <DayHeader
                  date={d}
                  today={today}
                  label={shortDays[weekday(d)]}
                  count={countFor(barber.id, d)}
                  onClick={() => navigate({ view: null, date: d })}
                />
              ),
            }))}
            onSlot={(barberId, d, time) => setPrefill({ barberId, date: d, time })}
            onOpen={setSelectedId}
            onTimeOff={canManageTimeOff ? (id) => setTimeOffFor(id) : undefined}
          />
        ) : null}
      </div>

      {/* Phone agenda */}
      <div className="md:hidden">
        {data.barbers.length > 1 ? (
          <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
            {data.barbers.map((b) => (
              <BarberChip key={b.id} name={b.name} photo={b.photo} active={b.id === data.barberId} onClick={() => navigate({ barber: String(b.id) })} />
            ))}
          </div>
        ) : null}

        <div className="mb-4 flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate({ date: addDays(date, -7) })}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            aria-label={t("prevWeek")}
          >
            <CaretLeft size={18} />
          </button>
          <div className="grid flex-1 grid-cols-7 gap-1">
            {days.map((d) => {
              const active = d === date;
              const n = barber ? countFor(barber.id, d) : 0;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => navigate({ date: d })}
                  aria-pressed={active}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs transition-colors",
                    active ? "bg-accent text-accent-fg" : "hover:bg-surface-2",
                    !active && d === today && "ring-1 ring-accent ring-inset",
                  )}
                >
                  <span className={cn(active ? "text-accent-fg/80" : "text-muted")}>{shortDays[weekday(d)]}</span>
                  <span className="text-base font-semibold">{Number(d.slice(8))}</span>
                  <span className={cn("tabular text-[10px]", active ? "text-accent-fg/80" : "text-subtle")}>{n || ""}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => navigate({ date: addDays(date, 7) })}
            className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2"
            aria-label={t("nextWeek")}
          >
            <CaretRight size={18} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {date !== today ? (
            <Button variant="secondary" size="sm" className="h-11" onClick={() => navigate({ date: null })}>
              {tTime("today")}
            </Button>
          ) : null}
          {cancelledToggle}
          {canManageTimeOff && barber ? (
            <Button variant="secondary" size="sm" className="h-11" onClick={() => setTimeOffFor(barber.id)}>
              <CalendarSlash size={16} />
              {t("timeOff")}
            </Button>
          ) : null}
        </div>

        {barber ? (
          <Agenda
            barber={barber}
            date={date}
            today={today}
            axis={axis}
            appointments={data.day.filter((a) => a.barber.id === barber.id)}
            timeOff={data.timeOff}
            onOpen={setSelectedId}
            onNew={(time) => setPrefill({ barberId: barber.id, date, time })}
            onTimeOff={canManageTimeOff ? () => setTimeOffFor(barber.id) : undefined}
          />
        ) : null}

        <button
          type="button"
          onClick={() => setPrefill({ barberId: data.barberId, date, time: null })}
          className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-card active:scale-95 md:hidden"
          aria-label={t("new")}
        >
          <Plus size={24} weight="bold" />
        </button>
      </div>

      {selected ? <AppointmentDialog key={selected.id} appointment={selected} onClose={() => setSelectedId(null)} /> : null}
      {prefill ? <NewAppointmentDialog barbers={data.barbers} services={data.services} prefill={prefill} onClose={closeNew} /> : null}
      {timeOffFor !== undefined ? (
        <TimeOffDialog barbers={data.barbers} barberId={timeOffFor} date={date < today ? today : date} onClose={() => setTimeOffFor(undefined)} />
      ) : null}
    </div>
  );
}

function BarberChip({ name, photo, active, onClick }: { name: string; photo: string | null; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 rounded-full border py-1 pr-4 pl-1 text-sm font-medium transition-colors",
        active ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2",
      )}
    >
      <Avatar src={photo} name={name} size={34} />
      {name}
    </button>
  );
}
