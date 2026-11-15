"use server";

import { and, asc, eq, exists, gt, ilike, or, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { appointments, barbers, clients, services, timeOff } from "@/db/schema";
import { appointmentScope, assertInScope, getDashboardContext, type DashboardContext } from "@/lib/dashboard/context";
import { getAvailability } from "@/lib/slots";
import { dateKey, isValidDate, zoned } from "@/lib/time";
import { bookingCode, normalizePhone, priceFor } from "@/lib/utils";
import type { ActionResult, ClientHit } from "./types";

const OVERLAP = "23P01";
const UNIQUE = "23505";

function pgCode(e: unknown): string | undefined {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code ?? err?.cause?.code;
}

function isForbidden(e: unknown) {
  return e instanceof Error && e.message === "forbidden";
}

const dateSchema = z.string().refine(isValidDate);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const idSchema = z.uuid();

async function loadBarber(ctx: DashboardContext, barberId: number) {
  const barber = await db.query.barbers.findFirst({ where: and(eq(barbers.id, barberId), eq(barbers.active, true)) });
  if (!barber) return null;
  assertInScope(ctx, { locationId: barber.locationId, barberId: barber.id });
  return barber;
}

async function loadAppointment(ctx: DashboardContext, id: string) {
  const row = await db.query.appointments.findFirst({ where: eq(appointments.id, id) });
  if (!row) return null;
  assertInScope(ctx, { locationId: row.locationId, barberId: row.barberId });
  return row;
}

/** Free start times for a barber + service on one day (staff side, same rules as online booking). */
export async function getFreeSlots(input: { barberId: number; serviceId: number; date: string; excludeAppointmentId?: string }) {
  const parsed = z
    .object({ barberId: z.number().int(), serviceId: z.number().int(), date: dateSchema, excludeAppointmentId: idSchema.optional() })
    .safeParse(input);
  if (!parsed.success) return { open: false, slots: [] as string[] };
  const ctx = await getDashboardContext();
  try {
    if (!(await loadBarber(ctx, parsed.data.barberId))) return { open: false, slots: [] as string[] };
  } catch {
    return { open: false, slots: [] as string[] };
  }
  const map = await getAvailability({
    barberIds: [parsed.data.barberId],
    serviceId: parsed.data.serviceId,
    from: parsed.data.date,
    days: 1,
    excludeAppointmentId: parsed.data.excludeAppointmentId,
  });
  const day = map.get(parsed.data.barberId)?.[0];
  return { open: day?.open ?? false, slots: day?.slots ?? [] };
}

/** Clients the viewer has served (owners: everyone), by name or phone. */
export async function searchClients(query: string): Promise<ClientHit[]> {
  const q = String(query ?? "").trim().slice(0, 60);
  if (q.length < 2) return [];
  const ctx = await getDashboardContext();
  const digits = q.replace(/\D/g, "").replace(/^0+/, "");
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  // Drizzle leaves columns unqualified in single-table selects, so the outer row is named explicitly.
  const outerId = sql.raw(`"clients"."id"`);
  const visits = sql<number>`(select count(*) from ${appointments} where ${appointments.clientId} = ${outerId} and ${appointments.status} = 'completed')::int`;
  const scoped =
    ctx.user.role === "owner"
      ? undefined
      : exists(db.select({ one: sql`1` }).from(appointments).where(appointmentScope(ctx, sql`${appointments.clientId} = ${outerId}`)));
  return db
    .select({ id: clients.id, name: clients.name, phone: clients.phone, visits })
    .from(clients)
    .where(and(or(ilike(clients.name, `%${escaped}%`), digits.length >= 3 ? ilike(clients.phone, `%${digits}%`) : undefined), scoped))
    .orderBy(asc(clients.name))
    .limit(8);
}

/** Visit count + who it could move to, loaded when the details dialog opens. */
export async function getAppointmentExtras(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  const ctx = await getDashboardContext();
  let appt;
  try {
    appt = await loadAppointment(ctx, id);
  } catch {
    return null;
  }
  if (!appt) return null;
  const [[{ visits }], service, candidates] = await Promise.all([
    db
      .select({ visits: sql<number>`count(*)::int` })
      .from(appointments)
      .where(and(eq(appointments.clientId, appt.clientId), eq(appointments.status, "completed"))),
    db.query.services.findFirst({ where: eq(services.id, appt.serviceId) }),
    db
      .select({ id: barbers.id, name: barbers.name, level: barbers.level, locationId: barbers.locationId })
      .from(barbers)
      .where(
        and(
          eq(barbers.active, true),
          ctx.barber ? eq(barbers.id, ctx.barber.id) : undefined,
          ctx.scope.locationIds ? eq(barbers.locationId, appt.locationId) : undefined,
        ),
      )
      .orderBy(asc(barbers.name)),
  ]);
  return {
    visits,
    barbers: service ? candidates.filter((b) => priceFor(service, b.level) != null) : [],
  };
}

const StatusSchema = z.object({ id: idSchema, status: z.enum(["booked", "completed", "no_show", "cancelled"]) });

export async function setAppointmentStatus(id: string, status: "booked" | "completed" | "no_show" | "cancelled"): Promise<ActionResult> {
  const parsed = StatusSchema.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: "invalid" };
  const ctx = await getDashboardContext();
  try {
    const appt = await loadAppointment(ctx, parsed.data.id);
    if (!appt) return { ok: false, error: "notFound" };
    const next = parsed.data.status;
    if (next === "completed" || next === "no_show") {
      if (appt.status === "cancelled") return { ok: false, error: "invalid" };
      // Marking the outcome of a visit only makes sense on or after its day.
      if (dateKey(appt.startsAt) > dateKey()) return { ok: false, error: "notStarted" };
    }
    if (next === "cancelled" && appt.status !== "booked") return { ok: false, error: "invalid" };
    await db.update(appointments).set({ status: next, updatedAt: new Date() }).where(eq(appointments.id, appt.id));
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    if (pgCode(e) === OVERLAP) return { ok: false, error: "slotTaken" };
    throw e;
  }
  refresh();
  return { ok: true };
}

const DetailsSchema = z.object({
  id: idSchema,
  price: z.coerce.number().int().min(0).max(100_000),
  note: z.string().trim().max(500),
});

export async function updateAppointmentDetails(input: { id: string; price: number | string; note: string }): Promise<ActionResult> {
  const parsed = DetailsSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = "invalid";
    return { ok: false, error: "invalid", fields };
  }
  const ctx = await getDashboardContext();
  try {
    const appt = await loadAppointment(ctx, parsed.data.id);
    if (!appt) return { ok: false, error: "notFound" };
    await db
      .update(appointments)
      .set({ price: parsed.data.price, note: parsed.data.note || null, updatedAt: new Date() })
      .where(eq(appointments.id, appt.id));
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    throw e;
  }
  refresh();
  return { ok: true };
}

const RescheduleSchema = z.object({ id: idSchema, barberId: z.number().int(), date: dateSchema, time: timeSchema });

export async function rescheduleAppointment(input: { id: string; barberId: number; date: string; time: string }): Promise<ActionResult> {
  const parsed = RescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const ctx = await getDashboardContext();
  try {
    const appt = await loadAppointment(ctx, parsed.data.id);
    if (!appt) return { ok: false, error: "notFound" };
    if (appt.status !== "booked") return { ok: false, error: "invalid" };
    const barber = await loadBarber(ctx, parsed.data.barberId);
    const service = await db.query.services.findFirst({ where: eq(services.id, appt.serviceId) });
    if (!barber || !service || priceFor(service, barber.level) == null) return { ok: false, error: "invalid" };

    const free = await getAvailability({
      barberIds: [barber.id],
      serviceId: service.id,
      from: parsed.data.date,
      days: 1,
      excludeAppointmentId: appt.id,
    });
    if (!free.get(barber.id)?.[0]?.slots.includes(parsed.data.time)) return { ok: false, error: "slotTaken" };

    const startsAt = zoned(parsed.data.date, parsed.data.time);
    await db
      .update(appointments)
      .set({
        barberId: barber.id,
        locationId: barber.locationId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appt.id));
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    if (pgCode(e) === OVERLAP) return { ok: false, error: "slotTaken" };
    throw e;
  }
  refresh();
  return { ok: true };
}

const CreateSchema = z
  .object({
    barberId: z.number().int(),
    serviceId: z.number().int(),
    date: dateSchema,
    time: timeSchema,
    clientId: z.number().int().optional(),
    clientName: z.string().trim().max(80).optional(),
    clientPhone: z.string().trim().max(30).optional(),
    source: z.enum(["phone", "walk_in"]),
    note: z.string().trim().max(500).optional(),
    price: z.coerce.number().int().min(0).max(100_000),
  })
  .superRefine((v, c) => {
    if (v.clientId) return;
    if (!v.clientName || v.clientName.length < 2) c.addIssue({ code: "custom", path: ["clientName"], message: "required" });
    const digits = (v.clientPhone ?? "").replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 12) c.addIssue({ code: "custom", path: ["clientPhone"], message: "phone" });
  });

export type CreateAppointmentInput = z.input<typeof CreateSchema>;

export async function createAppointment(input: CreateAppointmentInput): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message === "phone" ? "phone" : "required";
    return { ok: false, error: "invalid", fields };
  }
  const v = parsed.data;
  const ctx = await getDashboardContext();
  try {
    const [barber, service] = await Promise.all([
      loadBarber(ctx, v.barberId),
      db.query.services.findFirst({ where: and(eq(services.id, v.serviceId), eq(services.active, true)) }),
    ]);
    if (!barber) return { ok: false, error: "invalid", fields: { barberId: "required" } };
    if (!service || priceFor(service, barber.level) == null) return { ok: false, error: "invalid", fields: { serviceId: "required" } };

    const free = await getAvailability({ barberIds: [barber.id], serviceId: service.id, from: v.date, days: 1 });
    if (!free.get(barber.id)?.[0]?.slots.includes(v.time)) return { ok: false, error: "slotTaken", fields: { time: "slotTaken" } };

    let clientId = v.clientId;
    if (clientId) {
      const existing = await db.query.clients.findFirst({ where: eq(clients.id, clientId), columns: { id: true } });
      if (!existing) return { ok: false, error: "invalid", fields: { clientId: "required" } };
    } else {
      const phone = normalizePhone(v.clientPhone!);
      // Same phone = same person: reuse the record instead of creating a duplicate.
      const [created] = await db
        .insert(clients)
        .values({ name: v.clientName!, phone })
        .onConflictDoNothing({ target: clients.phone })
        .returning({ id: clients.id });
      clientId = created?.id ?? (await db.query.clients.findFirst({ where: eq(clients.phone, phone), columns: { id: true } }))!.id;
    }

    const startsAt = zoned(v.date, v.time);
    const values = {
      locationId: barber.locationId,
      barberId: barber.id,
      serviceId: service.id,
      clientId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
      price: v.price,
      status: "booked" as const,
      source: v.source,
      note: v.note || null,
    };
    let row: { id: string } | undefined;
    for (let attempt = 0; attempt < 3 && !row; attempt++) {
      try {
        [row] = await db.insert(appointments).values({ ...values, code: bookingCode() }).returning({ id: appointments.id });
      } catch (e) {
        // A 10-char code collision is astronomically rare; just draw again.
        if (pgCode(e) !== UNIQUE) throw e;
      }
    }
    if (!row) return { ok: false, error: "generic" };
    refresh();
    return { ok: true, id: row.id };
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    if (pgCode(e) === OVERLAP) return { ok: false, error: "slotTaken", fields: { time: "slotTaken" } };
    throw e;
  }
}

/* ------------------------------------------------------------------ */
/* Time off                                                             */
/* ------------------------------------------------------------------ */

const dateTimeSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

function managesTimeOff(ctx: DashboardContext) {
  return ctx.user.role === "owner" || ctx.user.role === "manager";
}

export async function listTimeOff(barberId: number) {
  if (!Number.isInteger(barberId)) return [];
  const ctx = await getDashboardContext();
  try {
    if (!(await loadBarber(ctx, barberId))) return [];
  } catch {
    return [];
  }
  return db
    .select({ id: timeOff.id, barberId: timeOff.barberId, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt, reason: timeOff.reason })
    .from(timeOff)
    .where(and(eq(timeOff.barberId, barberId), gt(timeOff.endsAt, new Date())))
    .orderBy(asc(timeOff.startsAt))
    .limit(30);
}

const TimeOffSchema = z
  .object({ barberId: z.number().int(), start: dateTimeSchema, end: dateTimeSchema, reason: z.string().trim().max(120).optional() })
  .refine((v) => v.end > v.start, { path: ["end"], message: "order" });

export async function addTimeOff(input: { barberId: number; start: string; end: string; reason?: string }): Promise<ActionResult> {
  const parsed = TimeOffSchema.safeParse(input);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] = issue.message === "order" ? "order" : "required";
    return { ok: false, error: "invalid", fields };
  }
  const ctx = await getDashboardContext();
  if (!managesTimeOff(ctx)) return { ok: false, error: "forbidden" };
  try {
    if (!(await loadBarber(ctx, parsed.data.barberId))) return { ok: false, error: "notFound" };
    const [sd, st] = parsed.data.start.split("T");
    const [ed, et] = parsed.data.end.split("T");
    await db.insert(timeOff).values({
      barberId: parsed.data.barberId,
      startsAt: zoned(sd, st),
      endsAt: zoned(ed, et),
      reason: parsed.data.reason || null,
    });
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    throw e;
  }
  refresh();
  return { ok: true };
}

export async function removeTimeOff(id: number): Promise<ActionResult> {
  if (!Number.isInteger(id)) return { ok: false, error: "invalid" };
  const ctx = await getDashboardContext();
  if (!managesTimeOff(ctx)) return { ok: false, error: "forbidden" };
  try {
    const row = await db
      .select({ id: timeOff.id, barberId: timeOff.barberId, locationId: barbers.locationId })
      .from(timeOff)
      .innerJoin(barbers, eq(barbers.id, timeOff.barberId))
      .where(eq(timeOff.id, id))
      .then((r) => r[0]);
    if (!row) return { ok: false, error: "notFound" };
    assertInScope(ctx, { locationId: row.locationId, barberId: row.barberId });
    await db.delete(timeOff).where(eq(timeOff.id, id));
  } catch (e) {
    if (isForbidden(e)) return { ok: false, error: "forbidden" };
    throw e;
  }
  refresh();
  return { ok: true };
}
