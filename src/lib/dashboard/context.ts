import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, asc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, locations } from "@/db/schema";
import { requireUser, scopeFor, type Scope, type SessionUser } from "@/lib/auth";
import type { Role } from "@/db/schema";

export const LOCATION_COOKIE = "molodoy_loc";
export const THEME_COOKIE = "molodoy_theme";
export type DashboardTheme = "system" | "light" | "dark";

export type DashboardContext = {
  user: SessionUser;
  scope: Scope;
  /** Locations this user may see, in display order. */
  locations: Array<typeof locations.$inferSelect>;
  /** The branch picked in the switcher; null = all branches in scope. */
  locationId: number | null;
  /** Barber row for barber accounts. */
  barber: typeof barbers.$inferSelect | null;
};

/**
 * Everything a dashboard page needs to know about who is looking and which branch is selected.
 * Pass `roles` to restrict the page (others are redirected to the overview).
 */
export const getDashboardContext = cache(async (roles?: Role[]): Promise<DashboardContext> => {
  const user = await requireUser(roles);
  const scope = scopeFor(user);

  const barber = scope.barberId ? ((await db.query.barbers.findFirst({ where: eq(barbers.id, scope.barberId) })) ?? null) : null;
  const allowedIds = barber ? [barber.locationId] : scope.locationIds;

  const locs = await db.query.locations.findMany({
    where: allowedIds ? inArray(locations.id, allowedIds.length ? allowedIds : [-1]) : undefined,
    orderBy: [asc(locations.sortOrder), asc(locations.id)],
  });

  const picked = Number((await cookies()).get(LOCATION_COOKIE)?.value);
  let locationId = locs.some((l) => l.id === picked) ? picked : null;
  // Managers and barbers have exactly one branch; there is no "all" for them.
  if (user.role !== "owner") locationId = locs[0]?.id ?? null;

  return { user, scope, locations: locs, locationId, barber };
});

/**
 * WHERE fragment that limits appointments to what the viewer may see and the branch they picked.
 * Always combine with this; never query appointments for the dashboard without it.
 */
export function appointmentScope(ctx: DashboardContext, ...extra: Array<SQL | undefined>) {
  return and(
    ctx.barber ? eq(appointments.barberId, ctx.barber.id) : undefined,
    ctx.locationId
      ? eq(appointments.locationId, ctx.locationId)
      : ctx.scope.locationIds
        ? inArray(appointments.locationId, ctx.scope.locationIds.length ? ctx.scope.locationIds : [-1])
        : undefined,
    ...extra,
  );
}

/** Same idea for the barbers table (team lists, calendar columns). */
export function barberScope(ctx: DashboardContext, ...extra: Array<SQL | undefined>) {
  return and(
    ctx.barber ? eq(barbers.id, ctx.barber.id) : undefined,
    ctx.locationId
      ? eq(barbers.locationId, ctx.locationId)
      : ctx.scope.locationIds
        ? inArray(barbers.locationId, ctx.scope.locationIds.length ? ctx.scope.locationIds : [-1])
        : undefined,
    ...extra,
  );
}

/** Throws when an appointment (or anything with a location/barber) is outside the viewer's scope. Use in server actions. */
export function assertInScope(ctx: DashboardContext, target: { locationId: number; barberId?: number | null }) {
  if (ctx.barber && target.barberId !== ctx.barber.id) throw new Error("forbidden");
  if (ctx.scope.locationIds && !ctx.scope.locationIds.includes(target.locationId)) throw new Error("forbidden");
}

/** `starts_at` as a Chișinău calendar day, for GROUP BY. */
export const localDay = sql<string>`to_char(${appointments.startsAt} AT TIME ZONE 'Europe/Chisinau', 'YYYY-MM-DD')`;
