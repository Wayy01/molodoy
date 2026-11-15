import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, clients, locations, users } from "@/db/schema";

export async function listStaff() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      active: users.active,
      lastLoginAt: users.lastLoginAt,
      locationName: locations.name,
      barberName: barbers.name,
    })
    .from(users)
    .leftJoin(locations, eq(locations.id, users.locationId))
    .leftJoin(barbers, eq(barbers.id, users.barberId))
    .orderBy(sql`case ${users.role} when 'owner' then 0 when 'manager' then 1 else 2 end`, asc(locations.sortOrder), asc(users.name));
}

export type StaffRow = Awaited<ReturnType<typeof listStaff>>[number];

export async function demoCounts() {
  const [[a], [c]] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(appointments).where(eq(appointments.demo, true)),
    db.select({ n: sql<number>`count(*)::int` }).from(clients).where(eq(clients.demo, true)),
  ]);
  return { appointments: a.n, clients: c.n };
}
