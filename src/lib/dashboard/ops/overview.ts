import "server-only";
import { asc, eq, gt, gte, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, locations, services, timeOff, type WeeklyHours } from "@/db/schema";
import { appointmentScope, barberScope, localDay, type DashboardContext } from "@/lib/dashboard/context";
import { addDays, hhmm, minutesOf, weekday, zoned } from "@/lib/time";
import { daysBetween, type Period } from "./period";
import { selectAppointments, ts } from "./queries";
import type { OpsAppointment } from "./types";

type Interval = [number, number];

/** Bookable minutes for one barber over [from, to]: their hours ∩ branch hours, minus (merged) time off. */
function availableMinutes(
  b: { workingHours: WeeklyHours; opensAt: string; closesAt: string },
  from: string,
  to: string,
  off: Interval[],
) {
  let total = 0;
  for (let i = 0, n = daysBetween(from, to); i <= n; i++) {
    const date = addDays(from, i);
    const hours = b.workingHours[weekday(date)];
    if (!hours) continue;
    const open = Math.max(minutesOf(hours.start), minutesOf(b.opensAt));
    const close = Math.min(minutesOf(hours.end), minutesOf(b.closesAt));
    if (close <= open) continue;
    const dayStart = zoned(date, hhmm(open)).getTime();
    const dayEnd = zoned(date, hhmm(close)).getTime();
    let blocked = 0;
    for (const [s, e] of off) blocked += Math.max(0, Math.min(e, dayEnd) - Math.max(s, dayStart));
    total += close - open - blocked / 60_000;
  }
  return total;
}

function mergeIntervals(list: Interval[]) {
  const sorted = [...list].sort((a, b) => a[0] - b[0]);
  const out: Interval[] = [];
  for (const iv of sorted) {
    const last = out.at(-1);
    if (last && iv[0] <= last[1]) last[1] = Math.max(last[1], iv[1]);
    else out.push([...iv]);
  }
  return out;
}

export type Kpis = {
  revenue: number;
  appointments: number;
  avgTicket: number;
  newClients: number;
  noShowRate: number | null;
  utilization: number | null;
};

export async function getOverview(ctx: DashboardContext, p: Period) {
  const F = zoned(p.from);
  const T = zoned(addDays(p.to, 1));
  const PF = zoned(p.prevFrom);
  const chartEnd = zoned(addDays(p.chartTo, 1));

  const st = appointments.startsAt;
  const cur = sql`${st} >= ${ts(F)} and ${st} < ${ts(T)}`;
  const prev = sql`${st} >= ${ts(PF)} and ${st} < ${ts(F)}`;
  const completed = sql`${appointments.status} = 'completed'`;
  const occupied = sql`${appointments.status} in ('completed', 'booked', 'no_show')`;
  const minutes = sql`extract(epoch from (${appointments.endsAt} - ${st})) / 60`;

  const bucket =
    p.bucket === "hour"
      ? sql<string>`to_char(${st} AT TIME ZONE 'Europe/Chisinau', 'HH24')`
      : p.bucket === "day"
        ? localDay
        : sql<string>`to_char(date_trunc('week', ${st} AT TIME ZONE 'Europe/Chisinau'), 'YYYY-MM-DD')`;

  const firstVisits = db
    .select({ first: sql<string>`min(${st})`.as("first") })
    .from(appointments)
    .where(appointmentScope(ctx, ne(appointments.status, "cancelled")))
    .groupBy(appointments.clientId)
    .as("first_visits");

  const [byBarber, [newClients], series, mix, heat, barberRows, off, today, [todayLeft]] = await Promise.all([
    db
      .select({
        locationId: appointments.locationId,
        barberId: appointments.barberId,
        revenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${completed} and ${cur}), 0)::int`,
        revenuePrev: sql<number>`coalesce(sum(${appointments.price}) filter (where ${completed} and ${prev}), 0)::int`,
        appts: sql<number>`(count(*) filter (where ${appointments.status} <> 'cancelled' and ${cur}))::int`,
        apptsPrev: sql<number>`(count(*) filter (where ${appointments.status} <> 'cancelled' and ${prev}))::int`,
        done: sql<number>`(count(*) filter (where ${completed} and ${cur}))::int`,
        donePrev: sql<number>`(count(*) filter (where ${completed} and ${prev}))::int`,
        noShow: sql<number>`(count(*) filter (where ${appointments.status} = 'no_show' and ${cur}))::int`,
        noShowPrev: sql<number>`(count(*) filter (where ${appointments.status} = 'no_show' and ${prev}))::int`,
        minutes: sql<number>`coalesce(sum(${minutes}) filter (where ${occupied} and ${cur}), 0)::int`,
        minutesPrev: sql<number>`coalesce(sum(${minutes}) filter (where ${occupied} and ${prev}), 0)::int`,
      })
      .from(appointments)
      .where(appointmentScope(ctx, gte(st, PF), lt(st, T)))
      .groupBy(appointments.locationId, appointments.barberId),
    db
      .select({
        cur: sql<number>`(count(*) filter (where ${firstVisits.first} >= ${ts(F)} and ${firstVisits.first} < ${ts(T)}))::int`,
        prev: sql<number>`(count(*) filter (where ${firstVisits.first} >= ${ts(PF)} and ${firstVisits.first} < ${ts(F)}))::int`,
      })
      .from(firstVisits),
    db
      .select({
        bucket,
        revenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${completed}), 0)::int`,
        expected: sql<number>`coalesce(sum(${appointments.price}) filter (where ${appointments.status} = 'booked' and ${st} >= now()), 0)::int`,
      })
      .from(appointments)
      .where(appointmentScope(ctx, gte(st, F), lt(st, chartEnd)))
      .groupBy(sql`1`),
    db
      .select({
        serviceId: services.id,
        name: services.name,
        revenue: sql<number>`coalesce(sum(${appointments.price}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .innerJoin(services, eq(services.id, appointments.serviceId))
      .where(appointmentScope(ctx, eq(appointments.status, "completed"), gte(st, F), lt(st, T)))
      .groupBy(services.id),
    db
      .select({
        dow: sql<number>`extract(isodow from ${st} AT TIME ZONE 'Europe/Chisinau')::int`,
        hour: sql<number>`extract(hour from ${st} AT TIME ZONE 'Europe/Chisinau')::int`,
        n: sql<number>`count(*)::int`,
      })
      .from(appointments)
      .where(appointmentScope(ctx, ne(appointments.status, "cancelled"), gte(st, F), lt(st, T)))
      .groupBy(sql`1`, sql`2`),
    db
      .select({
        id: barbers.id,
        name: barbers.name,
        level: barbers.level,
        photo: barbers.photo,
        active: barbers.active,
        locationId: barbers.locationId,
        workingHours: barbers.workingHours,
        opensAt: locations.opensAt,
        closesAt: locations.closesAt,
      })
      .from(barbers)
      .innerJoin(locations, eq(locations.id, barbers.locationId))
      .where(barberScope(ctx)),
    db
      .select({ barberId: timeOff.barberId, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt })
      .from(timeOff)
      .innerJoin(barbers, eq(barbers.id, timeOff.barberId))
      .where(barberScope(ctx, lt(timeOff.startsAt, T), gt(timeOff.endsAt, PF))),
    selectAppointments(
      appointmentScope(ctx, eq(appointments.status, "booked"), gte(st, zoned(p.today)), lt(st, zoned(addDays(p.today, 1)))),
    )
      .orderBy(asc(st))
      .limit(8),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(appointments)
      .where(appointmentScope(ctx, eq(appointments.status, "booked"), gte(st, zoned(p.today)), lt(st, zoned(addDays(p.today, 1))))),
  ]);

  // Utilization: only active barbers have a schedule to measure against.
  const offBy = new Map<number, Interval[]>();
  for (const o of off) offBy.set(o.barberId, [...(offBy.get(o.barberId) ?? []), [o.startsAt.getTime(), o.endsAt.getTime()]]);
  const capacity = new Map<number, { cur: number; prev: number }>();
  for (const b of barberRows) {
    if (!b.active) continue;
    const ivs = mergeIntervals(offBy.get(b.id) ?? []);
    capacity.set(b.id, { cur: availableMinutes(b, p.from, p.to, ivs), prev: availableMinutes(b, p.prevFrom, p.prevTo, ivs) });
  }

  const sum = (key: keyof (typeof byBarber)[number]) => byBarber.reduce((acc, r) => acc + (r[key] as number), 0);
  const busy = { cur: 0, prev: 0 };
  for (const r of byBarber) {
    if (!capacity.has(r.barberId)) continue;
    busy.cur += r.minutes;
    busy.prev += r.minutesPrev;
  }
  const cap = [...capacity.values()].reduce((a, c) => ({ cur: a.cur + c.cur, prev: a.prev + c.prev }), { cur: 0, prev: 0 });

  const kpi = (which: "cur" | "prev"): Kpis => {
    const k = which === "cur" ? "" : "Prev";
    const revenue = sum(`revenue${k}` as "revenue");
    const done = sum(`done${k}` as "done");
    const noShow = sum(`noShow${k}` as "noShow");
    return {
      revenue,
      appointments: sum(`appts${k}` as "appts"),
      avgTicket: done ? Math.round(revenue / done) : 0,
      newClients: newClients?.[which] ?? 0,
      noShowRate: done + noShow ? noShow / (done + noShow) : null,
      utilization: cap[which] ? busy[which] / cap[which] : null,
    };
  };

  const perBarber = new Map<number, { revenue: number; appts: number; done: number; minutes: number }>();
  const perLocation = new Map<number, number>();
  for (const r of byBarber) {
    const acc = perBarber.get(r.barberId) ?? { revenue: 0, appts: 0, done: 0, minutes: 0 };
    acc.revenue += r.revenue;
    acc.appts += r.appts;
    acc.done += r.done;
    acc.minutes += r.minutes;
    perBarber.set(r.barberId, acc);
    perLocation.set(r.locationId, (perLocation.get(r.locationId) ?? 0) + r.revenue);
  }

  const leaderboard = barberRows
    .filter((b) => (perBarber.get(b.id)?.appts ?? 0) > 0)
    .map((b) => {
      const s = perBarber.get(b.id)!;
      const capCur = capacity.get(b.id)?.cur ?? 0;
      return {
        id: b.id,
        name: b.name,
        level: b.level,
        photo: b.photo,
        locationId: b.locationId,
        revenue: s.revenue,
        appointments: s.appts,
        avgTicket: s.done ? Math.round(s.revenue / s.done) : 0,
        utilization: capCur ? s.minutes / capCur : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Chart buckets, zero-filled so gaps read as quiet days rather than missing data.
  const byBucket = new Map(series.map((s) => [s.bucket, s]));
  const chart: Array<{ key: string; revenue: number; expected: number }> = [];
  const fill = (key: string) => chart.push({ key, revenue: byBucket.get(key)?.revenue ?? 0, expected: byBucket.get(key)?.expected ?? 0 });
  if (p.bucket === "hour") {
    const hours = new Set([...series.map((s) => Number(s.bucket)), ...Array.from({ length: 10 }, (_, i) => 10 + i)]);
    for (const h of [...hours].sort((a, b) => a - b)) fill(String(h).padStart(2, "0"));
  } else if (p.bucket === "day") {
    for (let i = 0, n = daysBetween(p.from, p.chartTo); i <= n; i++) fill(addDays(p.from, i));
  } else {
    for (const s of [...series].sort((a, b) => a.bucket.localeCompare(b.bucket))) chart.push({ key: s.bucket, revenue: s.revenue, expected: s.expected });
  }
  const expected = series.reduce((a, s) => a + s.expected, 0);

  const mixTotal = mix.reduce((a, m) => a + m.revenue, 0);

  return {
    kpis: { cur: kpi("cur"), prev: kpi("prev") },
    expected,
    chart,
    byLocation: ctx.locations
      .map((l) => ({ id: l.id, name: l.name, revenue: perLocation.get(l.id) ?? 0 }))
      .filter((l) => perLocation.has(l.id))
      .sort((a, b) => b.revenue - a.revenue),
    leaderboard,
    mix: mix
      .map((m) => ({ id: m.serviceId, name: m.name, revenue: m.revenue, count: m.count, share: mixTotal ? m.revenue / mixTotal : 0 }))
      .sort((a, b) => b.revenue - a.revenue),
    heat: heat.map((h) => ({ dow: h.dow, hour: h.hour, n: h.n })),
    today: today as OpsAppointment[],
    todayLeft: todayLeft?.n ?? 0,
  };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;
