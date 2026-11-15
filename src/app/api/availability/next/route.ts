import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barbers, services } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getAvailability } from "@/lib/slots";
import { dateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const Query = z.object({
  location: z.coerce.number().int().positive(),
  service: z.coerce.number().int().positive().optional(),
});

/** GET /api/availability/next?location=1[&service=2] -> { [barberId]: { date, time } | null }. Defaults to the shortest haircut. */
export async function GET(request: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const [settings, team, fallback] = await Promise.all([
    getSettings(),
    db.query.barbers.findMany({
      where: and(eq(barbers.locationId, parsed.data.location), eq(barbers.active, true)),
      columns: { id: true },
    }),
    db.query.services.findFirst({
      where: and(eq(services.active, true), eq(services.category, "hair")),
      orderBy: [asc(services.durationMin), asc(services.sortOrder)],
      columns: { id: true },
    }),
  ]);
  const serviceId = parsed.data.service ?? fallback?.id;
  if (!serviceId) return NextResponse.json({});

  const map = await getAvailability({
    barberIds: team.map((b) => b.id),
    serviceId,
    from: dateKey(),
    days: settings.bookingHorizonDays,
  });

  const result: Record<number, { date: string; time: string } | null> = {};
  for (const [id, days] of map) {
    const day = days.find((d) => d.slots.length > 0);
    result[id] = day ? { date: day.date, time: day.slots[0] } : null;
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
