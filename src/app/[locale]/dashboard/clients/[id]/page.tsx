import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, CalendarPlus, ClockCounterClockwise, Envelope, Phone } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, Stat } from "@/components/dashboard/admin/layout-bits";
import { StatusBadge } from "@/components/dashboard/admin/status-badge";
import { ClientProfileForm } from "@/components/dashboard/admin/clients/client-profile-form";
import { getClientDetail } from "@/lib/dashboard/admin/clients";
import { getDashboardContext } from "@/lib/dashboard/context";
import { cn, formatMDL, formatPhone, t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("clients") };
}

export default async function ClientDetailPage({ params }: PageProps<"/[locale]/dashboard/clients/[id]">) {
  const { id } = await params;
  const clientId = Number(id);
  if (!Number.isInteger(clientId) || clientId <= 0) notFound();

  const ctx = await getDashboardContext();
  const [detail, t, tNav, format, locale] = await Promise.all([
    getClientDetail(ctx, clientId),
    getTranslations("dashAdmin.clientDetail"),
    getTranslations("dashboard.nav"),
    getFormatter(),
    getLocale(),
  ]);
  if (!detail) notFound();
  const { client, stats, history, favorite } = detail;
  const day = (d: Date | null) => (d ? format.dateTime(d, { day: "numeric", month: "short", year: "numeric" }) : "-");
  const bookAgain = favorite ? `/dashboard/calendar?barber=${favorite.id}&new=1` : "/dashboard/calendar?new=1";
  const showBranch = !ctx.barber && !ctx.locationId && ctx.locations.length > 1;

  return (
    <>
      <Link href="/dashboard/clients" className="mb-4 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {tNav("clients")}
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={client.name} size={56} />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{client.name}</h1>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
              <a href={`tel:${client.phone}`} className="tabular inline-flex items-center gap-1.5 hover:text-fg">
                <Phone size={15} />
                {formatPhone(client.phone)}
              </a>
              {client.email ? (
                <a href={`mailto:${client.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-fg">
                  <Envelope size={15} />
                  <span className="truncate">{client.email}</span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${client.phone}`} className={buttonVariants({ variant: "secondary", className: "flex-1 sm:hidden" })}>
            <Phone size={18} />
            {t("call")}
          </a>
          <Link href={bookAgain} className={buttonVariants({ className: "flex-1 sm:flex-none" })}>
            <CalendarPlus size={18} />
            {t("bookAgain")}
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label={t("stats.visits")} value={stats.visits} />
        <Stat label={t("stats.spent")} value={formatMDL(stats.spent, locale)} />
        <Stat label={t("stats.avgTicket")} value={stats.visits ? formatMDL(stats.avgTicket, locale) : "-"} />
        <Stat label={t("stats.noShows")} value={<span className={cn(stats.noShows > 0 && "text-danger")}>{stats.noShows}</span>} />
        <Stat label={t("stats.firstVisit")} value={<span className="text-lg sm:text-xl">{day(stats.firstVisit)}</span>} />
        <Stat
          label={t("stats.avgGap")}
          value={stats.avgGapDays !== null ? t("stats.days", { count: stats.avgGapDays }) : "-"}
          hint={favorite ? t("stats.favorite", { name: favorite.name }) : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <Card title={t("profile")} className="lg:sticky lg:top-24 lg:order-2">
          <ClientProfileForm client={client} />
        </Card>

        <Card title={t("history")} description={t("historyCount", { count: history.length })} className="lg:order-1">
          {history.length === 0 ? (
            <EmptyState icon={<ClockCounterClockwise />} title={t("historyEmpty")} className="py-10" />
          ) : (
            <ol className="-mx-4 divide-y divide-line sm:-mx-6">
              {history.map((a) => (
                <li key={a.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-6">
                  <div className="w-14 shrink-0 text-center">
                    <p className="tabular font-display text-lg leading-none font-semibold">{format.dateTime(a.startsAt, { day: "numeric" })}</p>
                    <p className="mt-1 text-xs text-muted uppercase">{format.dateTime(a.startsAt, { month: "short" })}</p>
                    <p className="tabular text-[11px] text-subtle">{format.dateTime(a.startsAt, { year: "numeric" })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{t9n(a.service, locale)}</p>
                    <p className="truncate text-sm text-muted">
                      {format.dateTime(a.startsAt, { hour: "2-digit", minute: "2-digit" })}, {a.barber}
                      {showBranch ? `, ${t9n(a.location, locale)}` : ""}
                    </p>
                    {a.note ? <p className="mt-1 line-clamp-2 text-sm text-subtle">{a.note}</p> : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <StatusBadge status={a.status} />
                    <span className={cn("tabular text-sm", a.status === "completed" ? "text-fg" : "text-subtle line-through")}>
                      {formatMDL(a.price, locale)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  );
}
