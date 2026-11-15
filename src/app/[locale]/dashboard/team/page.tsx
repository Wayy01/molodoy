import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Key, Plus, Scissors } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkDays } from "@/components/dashboard/admin/team/work-days";
import { listTeam } from "@/lib/dashboard/admin/team";
import { getDashboardContext } from "@/lib/dashboard/context";
import { cn, formatMDL, t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("team") };
}

export default async function TeamPage() {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const [team, t, tNav, tWeek, tCommon, locale] = await Promise.all([
    listTeam(ctx),
    getTranslations("dashAdmin.team"),
    getTranslations("dashboard.nav"),
    getTranslations("common.weekdays"),
    getTranslations("dashboard.common"),
    getLocale(),
  ]);
  const days = tWeek.raw("short") as string[];
  const revenue = team.reduce((sum, b) => sum + b.revenue, 0);
  const groups = ctx.locations
    .map((loc) => ({ loc, barbers: team.filter((b) => b.locationId === loc.id) }))
    .filter((g) => g.barbers.length > 0);

  return (
    <>
      <PageHeader
        title={tNav("team")}
        description={t("description", { count: team.length, revenue: formatMDL(revenue, locale) })}
        actions={
          <Link href="/dashboard/team/new" className={buttonVariants({ className: "w-full sm:w-auto" })}>
            <Plus size={18} />
            {t("add")}
          </Link>
        }
      />

      {groups.length === 0 ? (
        <EmptyState icon={<Scissors />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <div className="flex flex-col gap-10">
          {groups.map(({ loc, barbers }) => (
            <section key={loc.id}>
              <h2 className="mb-3 flex items-baseline gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
                {t9n(loc.name, locale)}
                <span className="tabular font-normal text-subtle normal-case">{t("barbersCount", { count: barbers.length })}</span>
              </h2>
              <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {barbers.map((b) => (
                  <li key={b.id}>
                    <Link
                      href={`/dashboard/team/${b.id}`}
                      className={cn(
                        "flex h-full flex-col gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong active:bg-surface-2",
                        !b.active && "opacity-60",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar src={b.photo} name={b.name} size={56} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold">{b.name}</p>
                            <LevelBadge level={b.level} />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {b.active ? <Badge tone="success">{tCommon("active")}</Badge> : <Badge>{tCommon("inactive")}</Badge>}
                            {b.loginActive !== null ? (
                              <Badge tone={b.loginActive ? "neutral" : "warning"} title={t("hasLogin")}>
                                <Key size={12} />
                                {b.loginActive ? t("hasLogin") : t("loginDisabled")}
                              </Badge>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <WorkDays hours={b.workingHours} labels={days} />
                      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-line pt-3">
                        <div>
                          <p className="text-xs text-muted">{t("monthRevenue")}</p>
                          <p className="tabular mt-0.5 font-display text-lg font-semibold">{formatMDL(b.revenue, locale)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted">{t("monthBookings")}</p>
                          <p className="tabular mt-0.5 font-display text-lg font-semibold">{b.bookings}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
