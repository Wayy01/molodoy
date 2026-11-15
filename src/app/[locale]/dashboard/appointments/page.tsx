import { getTranslations, setRequestLocale } from "next-intl/server";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { buttonVariants } from "@/components/ui/button";
import { AppointmentsFilters } from "@/components/dashboard/ops/appointments-filters";
import { AppointmentsList } from "@/components/dashboard/ops/appointments-list";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getScopedBarbers, listAppointments, parseAppointmentFilters } from "@/lib/dashboard/ops/queries";
import { dateKey } from "@/lib/time";
import { cn } from "@/lib/utils";

export default async function AppointmentsPage({ params, searchParams }: PageProps<"/[locale]/dashboard/appointments">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [ctx, sp] = await Promise.all([getDashboardContext(), searchParams]);
  const f = parseAppointmentFilters(sp);
  const [list, barberList, t, tc, tNav] = await Promise.all([
    listAppointments(ctx, f),
    ctx.barber ? [] : getScopedBarbers(ctx),
    getTranslations("dashOps.list"),
    getTranslations("dashboard.common"),
    getTranslations("dashboard.nav"),
  ]);

  const query = new URLSearchParams();
  for (const [k, v] of Object.entries({ from: f.from, to: f.to, loc: f.loc, barber: f.barber, status: f.status, q: f.q })) {
    if (v) query.set(k, String(v));
  }
  const pageHref = (page: number) => {
    const next = new URLSearchParams(query);
    if (page > 1) next.set("page", String(page));
    return `/dashboard/appointments?${next.toString()}`;
  };
  const exportHref = `/api/dashboard/appointments/export?${query.toString()}&locale=${locale}`;

  return (
    <>
      <PageHeader
        title={tNav("appointments")}
        description={t("total", { count: list.total })}
        actions={
          <a href={exportHref} download className={buttonVariants({ variant: "secondary" })}>
            <DownloadSimple size={18} />
            {tc("export")}
          </a>
        }
      />
      <AppointmentsFilters
        filters={{ from: f.from, to: f.to, loc: f.loc, barber: f.barber, status: f.status, q: f.q }}
        today={dateKey()}
        barbers={barberList.map((b) => ({ id: b.id, name: b.name, locationId: b.locationId }))}
        locations={ctx.user.role === "owner" && !ctx.locationId ? ctx.locations.map((l) => ({ id: l.id, name: l.name })) : null}
      />
      <AppointmentsList rows={list.rows} />
      {list.pages > 1 ? (
        <nav className="mt-6 flex items-center justify-between gap-3" aria-label={t("pagination")}>
          <Link
            href={pageHref(f.page - 1)}
            aria-disabled={f.page <= 1}
            className={cn(buttonVariants({ variant: "secondary" }), f.page <= 1 && "pointer-events-none opacity-45")}
          >
            {tc("previous")}
          </Link>
          <span className="tabular text-sm text-muted">{tc("page", { page: f.page, total: list.pages })}</span>
          <Link
            href={pageHref(f.page + 1)}
            aria-disabled={f.page >= list.pages}
            className={cn(buttonVariants({ variant: "secondary" }), f.page >= list.pages && "pointer-events-none opacity-45")}
          >
            {tc("next")}
          </Link>
        </nav>
      ) : null}
    </>
  );
}
