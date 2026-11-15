import "server-only";
import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, locations, timeOff, users } from "@/db/schema";
import { appointmentScope, barberScope, type DashboardContext } from "@/lib/dashboard/context";
import { dateKey, zoned } from "@/lib/time";

/** [start, end) of the current Chișinău calendar month. */
export function currentMonth() {
  const [y, m] = dateKey().split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { from: zoned(`${y}-${String(m).padStart(2, "0")}-01`), to: zoned(next) };
}

/** Every barber the viewer may manage, with this month's numbers and login state, in one query. */
export async function listTeam(ctx: DashboardContext) {
  const { from, to } = currentMonth();
  const month = db.$with("month").as(
    db
      .select({
        barberId: appointments.barberId,
        revenue: sql<number>`coalesce(sum(${appointments.price}) filter (where ${appointments.status} = 'completed'), 0)::int`.as("revenue"),
        bookings: sql<number>`(count(*) filter (where ${appointments.status} <> 'cancelled'))::int`.as("bookings"),
      })
      .from(appointments)
      .where(appointmentScope(ctx, gte(appointments.startsAt, from), lt(appointments.startsAt, to)))
      .groupBy(appointments.barberId),
  );

  return db
    .with(month)
    .select({
      id: barbers.id,
      name: barbers.name,
      slug: barbers.slug,
      level: barbers.level,
      photo: barbers.photo,
      active: barbers.active,
      workingHours: barbers.workingHours,
      locationId: barbers.locationId,
      revenue: sql<number>`coalesce(${month.revenue}, 0)`,
      bookings: sql<number>`coalesce(${month.bookings}, 0)`,
      loginActive: users.active,
    })
    .from(barbers)
    .innerJoin(locations, eq(locations.id, barbers.locationId))
    .leftJoin(month, eq(month.barberId, barbers.id))
    .leftJoin(users, eq(users.barberId, barbers.id))
    .where(barberScope(ctx))
    .orderBy(asc(locations.sortOrder), desc(barbers.active), asc(barbers.sortOrder), asc(barbers.name));
}

export type TeamMember = Awaited<ReturnType<typeof listTeam>>[number];

/**
 * Barbers the viewer may edit, ignoring the branch picked in the switcher, so an owner who just moved
 * a barber to another branch doesn't land on a 404.
 */
export function managedBarbers(ctx: DashboardContext) {
  const ids = ctx.scope.locationIds;
  return ids ? inArray(barbers.locationId, ids.length ? ids : [-1]) : undefined;
}

/** Barber, their staff login and time off (last 30 days onward). `null` when outside the viewer's scope. */
export async function getBarberEditor(ctx: DashboardContext, id: number) {
  const since = new Date(Date.now() - 30 * 86_400_000);
  const [barber, login, absences] = await Promise.all([
    db.query.barbers.findFirst({ where: and(eq(barbers.id, id), managedBarbers(ctx)) }),
    db.query.users.findFirst({
      where: eq(users.barberId, id),
      columns: { id: true, email: true, active: true, lastLoginAt: true },
    }),
    db
      .select()
      .from(timeOff)
      .where(and(eq(timeOff.barberId, id), gte(timeOff.endsAt, since)))
      .orderBy(asc(timeOff.startsAt)),
  ]);
  if (!barber) return null;
  const now = Date.now();
  return { barber, login: login ?? null, absences: absences.map((a) => ({ ...a, past: +a.endsAt < now })) };
}

export type BarberEditor = NonNullable<Awaited<ReturnType<typeof getBarberEditor>>>;
