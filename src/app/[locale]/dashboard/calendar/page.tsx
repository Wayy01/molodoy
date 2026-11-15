import { eq } from "drizzle-orm";
import { setRequestLocale } from "next-intl/server";
import { db } from "@/db";
import { barbers } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getCalendarData, parseCalendarParams } from "@/lib/dashboard/ops/queries";
import { dateKey } from "@/lib/time";
import { CalendarView } from "@/components/dashboard/ops/calendar-view";

export default async function CalendarPage({ params, searchParams }: PageProps<"/[locale]/dashboard/calendar">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [ctx, raw] = await Promise.all([getDashboardContext(), searchParams]);
  const sp = { ...raw };

  // "Book again" links carry only a barber; open the branch that barber works at.
  if (!ctx.locationId && !sp.loc && typeof sp.barber === "string") {
    const row = await db.query.barbers.findFirst({ where: eq(barbers.id, Number(sp.barber) || 0), columns: { locationId: true } });
    if (row && ctx.locations.some((l) => l.id === row.locationId)) sp.loc = String(row.locationId);
  }

  const p = parseCalendarParams(ctx, sp);
  const location = ctx.locations.find((l) => l.id === p?.locationId);
  if (!p || !location) return null;
  const data = await getCalendarData(ctx, p);

  return (
    <CalendarView
      data={data}
      date={p.date}
      today={dateKey()}
      view={p.view}
      showCancelled={p.showCancelled}
      location={{ id: location.id, opensAt: location.opensAt, closesAt: location.closesAt }}
      branches={ctx.locationId ? null : ctx.locations.map((l) => ({ id: l.id, name: l.name }))}
      openNew={sp.new === "1"}
      canManageTimeOff={ctx.user.role !== "barber"}
    />
  );
}
