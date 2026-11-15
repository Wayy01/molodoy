import { getBookingByCode } from "@/lib/booking/queries";
import { t9n } from "@/lib/utils";

export const dynamic = "force-dynamic";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (s: string) => s.replace(/[\;,]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");

/** Calendar file so the client can drop the appointment into Apple/Google Calendar. */
export async function GET(request: Request, ctx: RouteContext<"/api/booking/[code]/ics">) {
  const { code } = await ctx.params;
  const row = await getBookingByCode(code);
  if (!row || row.appointment.status === "cancelled") return new Response("Not found", { status: 404 });

  const locale = new URL(request.url).searchParams.get("locale") === "ru" ? "ru" : "ro";
  const { appointment: a, barber, service, location } = row;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Molodoy Barbershop//Booking//RO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${a.id}@molodoy`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(a.startsAt)}`,
    `DTEND:${stamp(a.endsAt)}`,
    `SUMMARY:${esc(`Molodoy: ${t9n(service.name, locale)} (${barber.name})`)}`,
    `LOCATION:${esc(`Molodoy Barbershop, ${t9n(location.address, locale)}`)}`,
    `DESCRIPTION:${esc(`${a.code}\n${location.phone}`)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Molodoy",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="molodoy-${a.code}.ics"`,
    },
  });
}
