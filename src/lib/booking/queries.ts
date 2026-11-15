import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, clients, locations, services } from "@/db/schema";

/** Clients can cancel online up to this long before the appointment; after that they call. */
export const CANCEL_CUTOFF_MS = 2 * 60 * 60 * 1000;

export async function getBookingByCode(code: string) {
  const [row] = await db
    .select({ appointment: appointments, barber: barbers, service: services, location: locations, client: clients })
    .from(appointments)
    .innerJoin(barbers, eq(barbers.id, appointments.barberId))
    .innerJoin(services, eq(services.id, appointments.serviceId))
    .innerJoin(locations, eq(locations.id, appointments.locationId))
    .innerJoin(clients, eq(clients.id, appointments.clientId))
    .where(eq(appointments.code, code.toUpperCase().slice(0, 16)))
    .limit(1);
  return row;
}
