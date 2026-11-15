import "server-only";
import { asc, desc, eq, gt, gte, ilike, lt, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, clients, locations, services, timeOff, type AppointmentStatus } from "@/db/schema";
import { appointmentScope, barberScope, localDay, type DashboardContext } from "@/lib/dashboard/context";
import { addDays, dateKey, isValidDate, startOfWeek, zoned } from "@/lib/time";
import type { OpsAppointment, OpsBarber, OpsService, OpsTimeOff } from "./types";

/** Raw `sql` params skip drizzle's column mapping, so timestamps go in as ISO strings. */
export const ts = (d: Date) => sql`${d.toISOString()}::timestamptz`;

const appointmentFields = {
  id: appointments.id,
  code: appointments.code,
  startsAt: appointments.startsAt,
  endsAt: appointments.endsAt,
  status: appointments.status,
  source: appointments.source,
  price: appointments.price,
  note: appointments.note,
  client: { id: clients.id, name: clients.name, phone: clients.phone },
  service: { id: services.id, name: services.name, durationMin: services.durationMin },
  barber: { id: barbers.id, name: barbers.name, level: barbers.level, photo: barbers.photo },
  location: { id: locations.id, name: locations.name },
};

/** Appointments joined with everything the ops screens show. Always pass the where through appointmentScope. */
export function selectAppointments(where: SQL | undefined) {
  return db
    .select(appointmentFields)
    .from(appointments)
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(barbers, eq(barbers.id, appointments.barberId))
    .innerJoin(locations, eq(locations.id, appointments.locationId))
    .where(where)
    .$dynamic();
}

const LEVEL_RANK = { top: 0, pro: 1, barber: 2 } as const;

const barberFields = {
  id: barbers.id,
  name: barbers.name,
  level: barbers.level,
  photo: barbers.photo,
  locationId: barbers.locationId,
  workingHours: barbers.workingHours,
  sortOrder: barbers.sortOrder,
};

function sortBarbers<T extends { level: OpsBarber["level"]; sortOrder: number; name: string }>(rows: T[]) {
  return rows.sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getScopedBarbers(ctx: DashboardContext, locationId?: number | null): Promise<OpsBarber[]> {
  const rows = await db
    .select(barberFields)
    .from(barbers)
    .where(barberScope(ctx, eq(barbers.active, true), locationId ? eq(barbers.locationId, locationId) : undefined));
  return sortBarbers(rows).map((b) => ({
    id: b.id,
    name: b.name,
    level: b.level,
    photo: b.photo,
    locationId: b.locationId,
    workingHours: b.workingHours,
  }));
}

export async function getActiveServices(): Promise<OpsService[]> {
  return db
    .select({
      id: services.id,
      name: services.name,
      durationMin: services.durationMin,
      priceBarber: services.priceBarber,
      pricePro: services.pricePro,
      priceTop: services.priceTop,
    })
    .from(services)
    .where(eq(services.active, true))
    .orderBy(asc(services.sortOrder), asc(services.id));
}

/* ------------------------------------------------------------------ */
/* Calendar                                                             */
/* ------------------------------------------------------------------ */

export type CalendarView = "day" | "week";

export type CalendarParams = {
  locationId: number;
  date: string;
  view: CalendarView;
  barberId: number | null;
  showCancelled: boolean;
};

export function parseCalendarParams(ctx: DashboardContext, sp: Record<string, string | string[] | undefined>): CalendarParams | null {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const loc = Number(one("loc"));
  const locationId = ctx.locationId ?? (ctx.locations.some((l) => l.id === loc) ? loc : ctx.locations[0]?.id);
  if (!locationId) return null;
  const date = isValidDate(one("date")) ? one("date")! : dateKey();
  const barber = Number(one("barber"));
  return {
    locationId,
    date,
    view: one("view") === "week" ? "week" : "day",
    barberId: ctx.barber ? ctx.barber.id : Number.isInteger(barber) && barber > 0 ? barber : null,
    showCancelled: one("cancelled") === "1",
  };
}

export async function getCalendarData(ctx: DashboardContext, p: CalendarParams) {
  const weekStart = startOfWeek(p.date);
  const weekFrom = zoned(weekStart);
  const weekTo = zoned(addDays(weekStart, 7));
  const statusFilter = p.showCancelled ? undefined : ne(appointments.status, "cancelled");

  const weekAppointments = (barberId: number) =>
    selectAppointments(
      appointmentScope(
        ctx,
        eq(appointments.barberId, barberId),
        eq(appointments.locationId, p.locationId),
        gte(appointments.startsAt, weekFrom),
        lt(appointments.startsAt, weekTo),
        statusFilter,
      ),
    ).orderBy(asc(appointments.startsAt));

  const [barberList, serviceList, day, week, off, counts] = await Promise.all([
    getScopedBarbers(ctx, p.locationId),
    getActiveServices(),
    selectAppointments(
      appointmentScope(
        ctx,
        eq(appointments.locationId, p.locationId),
        gte(appointments.startsAt, zoned(p.date)),
        lt(appointments.startsAt, zoned(addDays(p.date, 1))),
        statusFilter,
      ),
    ).orderBy(asc(appointments.startsAt)),
    p.view === "week" && p.barberId ? weekAppointments(p.barberId) : null,
    db
      .select({ id: timeOff.id, barberId: timeOff.barberId, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt, reason: timeOff.reason })
      .from(timeOff)
      .innerJoin(barbers, eq(barbers.id, timeOff.barberId))
      .where(barberScope(ctx, eq(barbers.locationId, p.locationId), lt(timeOff.startsAt, weekTo), gt(timeOff.endsAt, weekFrom)))
      .orderBy(asc(timeOff.startsAt)),
    db
      .select({ barberId: appointments.barberId, day: localDay, n: sql<number>`count(*)::int` })
      .from(appointments)
      .where(
        appointmentScope(
          ctx,
          eq(appointments.locationId, p.locationId),
          ne(appointments.status, "cancelled"),
          gte(appointments.startsAt, weekFrom),
          lt(appointments.startsAt, weekTo),
        ),
      )
      .groupBy(appointments.barberId, sql`2`),
  ]);

  const barberId = p.barberId && barberList.some((b) => b.id === p.barberId) ? p.barberId : (barberList[0]?.id ?? null);
  // Week view without an explicit barber: one more round trip once we know who is first.
  const weekRows = p.view === "week" && barberId ? (week && barberId === p.barberId ? week : await weekAppointments(barberId)) : [];

  return {
    barbers: barberList,
    services: serviceList,
    barberId,
    weekStart,
    day: day as OpsAppointment[],
    week: weekRows as OpsAppointment[],
    timeOff: off as OpsTimeOff[],
    counts: counts.map((c) => ({ barberId: c.barberId, day: c.day, n: c.n })),
  };
}

export type CalendarData = Awaited<ReturnType<typeof getCalendarData>>;

/* ------------------------------------------------------------------ */
/* Appointments list                                                    */
/* ------------------------------------------------------------------ */

export const PAGE_SIZE = 50;
const STATUSES = ["booked", "completed", "no_show", "cancelled"] as const;

export type AppointmentFilters = {
  from: string;
  to: string;
  loc: number | null;
  barber: number | null;
  status: AppointmentStatus | null;
  q: string;
  page: number;
};

export function presetRange(preset: "today" | "upcoming" | "past30", today = dateKey()) {
  if (preset === "today") return { from: today, to: today };
  if (preset === "upcoming") return { from: today, to: addDays(today, 14) };
  return { from: addDays(today, -30), to: today };
}

export function parseAppointmentFilters(sp: Record<string, string | string[] | undefined> | URLSearchParams): AppointmentFilters {
  const get = (k: string) => {
    const v = sp instanceof URLSearchParams ? sp.get(k) : sp[k];
    return typeof v === "string" ? v : undefined;
  };
  const fallback = presetRange("upcoming");
  let from = isValidDate(get("from")) ? get("from")! : fallback.from;
  let to = isValidDate(get("to")) ? get("to")! : fallback.to;
  if (from > to) [from, to] = [to, from];
  const num = (k: string) => {
    const n = Number(get(k));
    return Number.isInteger(n) && n > 0 ? n : null;
  };
  const status = get("status");
  return {
    from,
    to,
    loc: num("loc"),
    barber: num("barber"),
    status: STATUSES.includes(status as AppointmentStatus) ? (status as AppointmentStatus) : null,
    q: (get("q") ?? "").trim().slice(0, 80),
    page: num("page") ?? 1,
  };
}

function likeEscape(value: string) {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function listWhere(ctx: DashboardContext, f: AppointmentFilters) {
  const q = f.q;
  const digits = q.replace(/\D/g, "").replace(/^0+/, "");
  const search = q
    ? or(
        ilike(clients.name, `%${likeEscape(q)}%`),
        ilike(appointments.code, `%${likeEscape(q.toUpperCase())}%`),
        digits.length >= 3 ? ilike(clients.phone, `%${digits}%`) : undefined,
      )
    : undefined;
  return appointmentScope(
    ctx,
    gte(appointments.startsAt, zoned(f.from)),
    lt(appointments.startsAt, zoned(addDays(f.to, 1))),
    f.loc ? eq(appointments.locationId, f.loc) : undefined,
    f.barber ? eq(appointments.barberId, f.barber) : undefined,
    f.status ? eq(appointments.status, f.status) : undefined,
    search,
  );
}

/** Upcoming ranges read top-down from the next visit; anything reaching into the past reads newest first. */
function listOrder(f: AppointmentFilters) {
  return f.from < dateKey() ? desc(appointments.startsAt) : asc(appointments.startsAt);
}

export async function listAppointments(ctx: DashboardContext, f: AppointmentFilters) {
  const where = listWhere(ctx, f);
  const [rows, [{ total }]] = await Promise.all([
    selectAppointments(where)
      .orderBy(listOrder(f), asc(barbers.name))
      .limit(PAGE_SIZE)
      .offset((f.page - 1) * PAGE_SIZE),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(appointments)
      .innerJoin(clients, eq(clients.id, appointments.clientId))
      .where(where),
  ]);
  return { rows: rows as OpsAppointment[], total, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const EXPORT_LIMIT = 20_000;

export async function exportAppointments(ctx: DashboardContext, f: AppointmentFilters) {
  return (await selectAppointments(listWhere(ctx, f)).orderBy(asc(appointments.startsAt)).limit(EXPORT_LIMIT)) as OpsAppointment[];
}
