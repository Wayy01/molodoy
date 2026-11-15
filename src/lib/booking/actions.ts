"use server";

import { and, count, eq, gt, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, barbers, clients, services } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { isSlotFree } from "@/lib/slots";
import { addDays, dateKey, zoned } from "@/lib/time";
import { bookingCode, normalizePhone, priceFor } from "@/lib/utils";
import { CANCEL_CUTOFF_MS } from "./queries";

const BookingInput = z.object({
  barberId: z.number().int().positive(),
  serviceId: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2, "name").max(60, "name"),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((p) => (p.startsWith("+373") ? /^\+373\d{8}$/.test(p) : /^\+\d{9,15}$/.test(p)), "phone"),
  email: z.union([z.literal(""), z.string().trim().toLowerCase().email("email")]).optional(),
  note: z.string().trim().max(300).optional(),
  // Honeypot: real people never see or fill this.
  website: z.string().max(0).optional(),
});

export type BookingInput = z.input<typeof BookingInput>;
export type BookingResult =
  | { ok: true; code: string }
  | { ok: false; error: "slot_taken" | "invalid" | "generic"; fields?: Array<"name" | "phone" | "email"> };

/** More than this many upcoming bookings on one phone looks like abuse, not a customer. */
const MAX_UPCOMING_PER_PHONE = 3;

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const parsed = BookingInput.safeParse(input);
  if (!parsed.success) {
    const fields = [...new Set(parsed.error.issues.map((i) => i.message))].filter((f): f is "name" | "phone" | "email" =>
      ["name", "phone", "email"].includes(f),
    );
    return { ok: false, error: "invalid", fields };
  }
  const data = parsed.data;

  const [settings, barber, service] = await Promise.all([
    getSettings(),
    db.query.barbers.findFirst({ where: and(eq(barbers.id, data.barberId), eq(barbers.active, true)) }),
    db.query.services.findFirst({ where: and(eq(services.id, data.serviceId), eq(services.active, true)) }),
  ]);
  const tierPrice = barber && service ? priceFor(service, barber.level) : null;
  if (!barber || !service || tierPrice == null) return { ok: false, error: "invalid" };

  const today = dateKey();
  if (data.date < today || data.date >= addDays(today, settings.bookingHorizonDays)) return { ok: false, error: "invalid" };
  if (!(await isSlotFree({ barberId: barber.id, serviceId: service.id, date: data.date, time: data.time }))) {
    return { ok: false, error: "slot_taken" };
  }

  const existing = await db.query.clients.findFirst({ where: eq(clients.phone, data.phone) });
  let clientId: number;
  let firstVisit = true;
  if (existing) {
    clientId = existing.id;
    const [[upcoming], [history]] = await Promise.all([
      db
        .select({ n: count() })
        .from(appointments)
        .where(and(eq(appointments.clientId, clientId), eq(appointments.status, "booked"), gt(appointments.startsAt, new Date()))),
      db
        .select({ n: count() })
        .from(appointments)
        .where(and(eq(appointments.clientId, clientId), ne(appointments.status, "cancelled"))),
    ]);
    if (upcoming.n >= MAX_UPCOMING_PER_PHONE) return { ok: false, error: "generic" };
    firstVisit = history.n === 0;
    if (data.email && !existing.email) await db.update(clients).set({ email: data.email }).where(eq(clients.id, clientId));
  } else {
    const [created] = await db
      .insert(clients)
      .values({ name: data.name, phone: data.phone, email: data.email || null })
      .onConflictDoUpdate({ target: clients.phone, set: { name: data.name } })
      .returning({ id: clients.id });
    clientId = created.id;
  }

  const discount = firstVisit && service.category === "hair" ? settings.firstVisitDiscount : 0;
  const startsAt = zoned(data.date, data.time);
  const code = bookingCode();

  try {
    await db.insert(appointments).values({
      code,
      locationId: barber.locationId,
      barberId: barber.id,
      serviceId: service.id,
      clientId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
      price: Math.max(0, tierPrice - discount),
      status: "booked",
      source: "online",
      note: data.note || null,
    });
  } catch (e) {
    // Lost the race for this slot to another booking (EXCLUDE constraint).
    if ((e as { code?: string })?.code === "23P01" || (e as { cause?: { code?: string } })?.cause?.code === "23P01") {
      return { ok: false, error: "slot_taken" };
    }
    throw e;
  }

  return { ok: true, code };
}

export async function cancelBooking(code: string): Promise<{ ok: boolean; error?: "too_late" | "not_found" }> {
  const appt = await db.query.appointments.findFirst({ where: eq(appointments.code, String(code).toUpperCase().slice(0, 16)) });
  if (!appt || appt.status !== "booked") return { ok: false, error: "not_found" };
  if (appt.startsAt.getTime() - Date.now() < CANCEL_CUTOFF_MS) return { ok: false, error: "too_late" };
  await db.update(appointments).set({ status: "cancelled", updatedAt: new Date() }).where(eq(appointments.id, appt.id));
  return { ok: true };
}
