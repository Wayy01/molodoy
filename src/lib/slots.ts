import "server-only";
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { appointments, barbers, locations, services, timeOff } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { addDays, hhmm, minutesOf, weekday, zoned } from "@/lib/time";
import { priceFor } from "@/lib/utils";

export type DayAvailability = {
  date: string;
  /** false when the barber does not work that day */
  open: boolean;
  slots: string[];
};

/** Clients can't grab a slot that starts in less than this. */
const LEAD_MINUTES = 15;

export async function getAvailability(opts: {
  barberIds: number[];
  serviceId: number;
  from: string;
  days: number;
  /** Ignore this appointment when checking overlaps (rescheduling it). */
  excludeAppointmentId?: string;
}) {
  const result = new Map<number, DayAvailability[]>();
  if (opts.barberIds.length === 0) return result;

  const [settings, service, barberRows] = await Promise.all([
    getSettings(),
    db.query.services.findFirst({ where: eq(services.id, opts.serviceId) }),
    db
      .select({
        id: barbers.id,
        level: barbers.level,
        workingHours: barbers.workingHours,
        opensAt: locations.opensAt,
        closesAt: locations.closesAt,
      })
      .from(barbers)
      .innerJoin(locations, eq(locations.id, barbers.locationId))
      .where(and(inArray(barbers.id, opts.barberIds), eq(barbers.active, true), eq(locations.active, true))),
  ]);
  if (!service || !service.active) return result;

  const rangeStart = zoned(opts.from);
  const rangeEnd = zoned(addDays(opts.from, opts.days));
  const ids = barberRows.map((b) => b.id);
  if (ids.length === 0) return result;

  const [busy, off] = await Promise.all([
    db
      .select({ barberId: appointments.barberId, id: appointments.id, startsAt: appointments.startsAt, endsAt: appointments.endsAt })
      .from(appointments)
      .where(
        and(
          inArray(appointments.barberId, ids),
          ne(appointments.status, "cancelled"),
          lt(appointments.startsAt, rangeEnd),
          gt(appointments.endsAt, rangeStart),
        ),
      ),
    db
      .select({ barberId: timeOff.barberId, startsAt: timeOff.startsAt, endsAt: timeOff.endsAt })
      .from(timeOff)
      .where(and(inArray(timeOff.barberId, ids), lt(timeOff.startsAt, rangeEnd), gt(timeOff.endsAt, rangeStart))),
  ]);

  const blocked = new Map<number, Array<[number, number]>>();
  for (const b of busy) {
    if (b.id === opts.excludeAppointmentId) continue;
    const list = blocked.get(b.barberId) ?? [];
    list.push([b.startsAt.getTime(), b.endsAt.getTime()]);
    blocked.set(b.barberId, list);
  }
  for (const o of off) {
    const list = blocked.get(o.barberId) ?? [];
    list.push([o.startsAt.getTime(), o.endsAt.getTime()]);
    blocked.set(o.barberId, list);
  }

  const earliest = Date.now() + LEAD_MINUTES * 60_000;
  const step = settings.slotStepMin;
  const duration = service.durationMin;

  for (const barber of barberRows) {
    const offered = priceFor(service, barber.level) != null;
    const intervals = blocked.get(barber.id) ?? [];
    const days: DayAvailability[] = [];
    for (let i = 0; i < opts.days; i++) {
      const date = addDays(opts.from, i);
      const hours = barber.workingHours[weekday(date)];
      if (!hours || !offered) {
        days.push({ date, open: !!hours && offered, slots: [] });
        continue;
      }
      const open = Math.max(minutesOf(hours.start), minutesOf(barber.opensAt));
      const close = Math.min(minutesOf(hours.end), minutesOf(barber.closesAt));
      const slots: string[] = [];
      for (let t = open; t + duration <= close; t += step) {
        const start = zoned(date, hhmm(t)).getTime();
        if (start < earliest) continue;
        const end = start + duration * 60_000;
        if (intervals.some(([s, e]) => start < e && end > s)) continue;
        slots.push(hhmm(t));
      }
      days.push({ date, open: true, slots });
    }
    result.set(barber.id, days);
  }
  return result;
}

export async function isSlotFree(opts: {
  barberId: number;
  serviceId: number;
  date: string;
  time: string;
  excludeAppointmentId?: string;
}) {
  const map = await getAvailability({
    barberIds: [opts.barberId],
    serviceId: opts.serviceId,
    from: opts.date,
    days: 1,
    excludeAppointmentId: opts.excludeAppointmentId,
  });
  return map.get(opts.barberId)?.[0]?.slots.includes(opts.time) ?? false;
}
