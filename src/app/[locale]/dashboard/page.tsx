import { eq } from "drizzle-orm";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Info } from "@phosphor-icons/react/dist/ssr";
import { db } from "@/db";
import { appointments } from "@/db/schema";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Card, Heatmap, KpiTile, Leaderboard, RangeTabs, RankedBars, compactAmount, compactMDL } from "@/components/dashboard/ops/overview-parts";
import { RevenueChart } from "@/components/dashboard/ops/revenue-chart";
import { TodayPanel } from "@/components/dashboard/ops/today-panel";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getOverview } from "@/lib/dashboard/ops/overview";
import { getPeriod, parseRange } from "@/lib/dashboard/ops/period";
import { formatMDL, t9n } from "@/lib/utils";
import { zoned } from "@/lib/time";

export default async function OverviewPage({ params, searchParams }: PageProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [ctx, sp] = await Promise.all([getDashboardContext(), searchParams]);
  const period = getPeriod(parseRange(sp.range));
  const isOwner = ctx.user.role === "owner";
  const isBarber = ctx.user.role === "barber";

  const [data, demo, t, tc, format] = await Promise.all([
    getOverview(ctx, period),
    isOwner ? db.select({ id: appointments.id }).from(appointments).where(eq(appointments.demo, true)).limit(1) : [],
    getTranslations("dashOps.overview"),
    getTranslations("dashboard.common"),
    getFormatter(),
  ]);
  const lc = locale;

  const { cur, prev } = data.kpis;
  const pct = (v: number | null) => (v === null ? "-" : format.number(v, { style: "percent", maximumFractionDigits: 1 }));
  const day = (d: string) => zoned(d, "12:00");
  const span = (a: string, b: string) =>
    a === b
      ? format.dateTime(day(a), { day: "numeric", month: "long" })
      : `${format.dateTime(day(a), { day: "numeric", month: "short" })} - ${format.dateTime(day(b), { day: "numeric", month: "short" })}`;

  const byBranch = !ctx.locationId && !isBarber;
  const barberBars = data.leaderboard.map((b) => ({
    key: b.id,
    label: b.name,
    value: b.revenue,
    display: compactMDL(b.revenue, lc),
    detail: formatMDL(b.revenue, lc),
  }));
  const branchBars = data.byLocation.map((l) => ({
    key: l.id,
    label: t9n(l.name, lc),
    value: l.revenue,
    display: compactMDL(l.revenue, lc),
    detail: formatMDL(l.revenue, lc),
  }));

  return (
    <>
      <PageHeader
        title={isBarber ? t("titleBarber", { name: ctx.user.name.split(" ")[0] }) : t("title")}
        description={t("period", { current: span(period.from, period.to), previous: span(period.prevFrom, period.prevTo) })}
        actions={<RangeTabs value={period.range} />}
      />

      {demo.length ? (
        <p className="mb-5 flex items-start gap-2.5 rounded-2xl border border-info/25 bg-info/10 px-4 py-3 text-sm">
          <Info size={18} className="mt-0.5 shrink-0 text-info" />
          {tc("demoNotice")}
        </p>
      ) : null}

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-6" aria-label={t("kpis.label")}>
        <KpiTile
          label={t("kpis.revenue")}
          value={compactAmount(cur.revenue, lc)}
          unit="MDL"
          title={formatMDL(cur.revenue, lc)}
          current={cur.revenue}
          previous={prev.revenue}
          hint={data.expected > 0 ? t("kpis.expected", { amount: compactMDL(data.expected, lc) }) : undefined}
        />
        <KpiTile label={t("kpis.appointments")} value={format.number(cur.appointments)} current={cur.appointments} previous={prev.appointments} />
        <KpiTile label={t("kpis.avgTicket")} value={compactAmount(cur.avgTicket, lc)} unit="MDL" current={cur.avgTicket || null} previous={prev.avgTicket || null} />
        <KpiTile label={t("kpis.newClients")} value={format.number(cur.newClients)} current={cur.newClients} previous={prev.newClients} />
        <KpiTile
          label={t("kpis.noShow")}
          value={pct(cur.noShowRate)}
          current={cur.noShowRate}
          previous={prev.noShowRate}
          kind="points"
          lowerIsBetter
        />
        <KpiTile label={t("kpis.utilization")} value={pct(cur.utilization)} current={cur.utilization} previous={prev.utilization} kind="points" />
      </section>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card
          title={t("chart.title")}
          subtitle={period.bucket === "week" ? t("chart.weekly") : period.bucket === "hour" ? t("chart.hourly") : t("chart.daily")}
          className="lg:col-span-2"
        >
          <RevenueChart data={data.chart} bucket={period.bucket} />
        </Card>
        <TodayPanel rows={data.today} total={data.todayLeft} showBranch={!ctx.locationId && ctx.locations.length > 1} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {isBarber ? null : (
          <Card title={byBranch ? t("byBranch") : t("byBarber")} subtitle={t("revenueCompleted")}>
            <RankedBars rows={byBranch ? branchBars : barberBars} empty={t("noRevenue")} />
          </Card>
        )}
        <Card title={t("mix.title")} subtitle={t("mix.subtitle")}>
          <RankedBars
            rows={data.mix.map((m) => ({
              key: m.id,
              label: (
                <>
                  {t9n(m.name, lc)} <span className="text-muted">· {format.number(m.share, { style: "percent", maximumFractionDigits: 0 })}</span>
                </>
              ),
              value: m.revenue,
              display: compactMDL(m.revenue, lc),
              detail: t("mix.detail", { count: m.count, amount: formatMDL(m.revenue, lc) }),
            }))}
            empty={t("noRevenue")}
          />
        </Card>
        {isBarber ? (
          <Card title={t("heatmap.title")} subtitle={t("heatmap.subtitle")}>
            <Heatmap cells={data.heat} />
          </Card>
        ) : null}
      </div>

      {isBarber ? null : (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card title={t("leaderboard.title")} subtitle={t("leaderboard.subtitle")} className="xl:col-span-2">
            <Leaderboard rows={data.leaderboard} locations={ctx.locations.map((l) => ({ id: l.id, name: l.name }))} />
          </Card>
          <Card title={t("heatmap.title")} subtitle={t("heatmap.subtitle")}>
            <Heatmap cells={data.heat} />
          </Card>
        </div>
      )}
    </>
  );
}
