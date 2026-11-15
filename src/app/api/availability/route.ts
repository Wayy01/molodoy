import { NextResponse } from "next/server";
import { z } from "zod";
import { getSettings } from "@/lib/data";
import { getAvailability } from "@/lib/slots";
import { dateKey } from "@/lib/time";

export const dynamic = "force-dynamic";

const Query = z.object({
  barber: z.coerce.number().int().positive(),
  service: z.coerce.number().int().positive(),
});

/** GET /api/availability?barber=1&service=2 -> { days: [{ date, open, slots: ["10:00", ...] }] } for the booking horizon. */
export async function GET(request: Request) {
  const parsed = Query.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "invalid_query" }, { status: 400 });

  const settings = await getSettings();
  const map = await getAvailability({
    barberIds: [parsed.data.barber],
    serviceId: parsed.data.service,
    from: dateKey(),
    days: settings.bookingHorizonDays,
  });
  return NextResponse.json({ days: map.get(parsed.data.barber) ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
