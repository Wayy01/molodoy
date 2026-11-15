import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { LevelBadge } from "@/components/ui/badge";
import { cn, formatMDL, t9n } from "@/lib/utils";
import { RANGES, type RangeKey } from "@/lib/dashboard/ops/period";
import type { Overview } from "@/lib/dashboard/ops/overview";
import type { Localized } from "@/db/schema";

export function Card({ title, subtitle, action, className, children }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function RangeTabs({ value }: { value: RangeKey }) {
  const t = useTranslations("dashOps.overview.ranges");
  return (
    <nav className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t("label")}>
      {RANGES.map((r) => (
        <Link
          key={r}
          href={r === "30d" ? "/dashboard" : `/dashboard?range=${r}`}
          aria-current={r === value ? "page" : undefined}
          className={cn(
            "flex h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors sm:h-9",
            r === value ? "border-fg bg-fg text-bg" : "border-line-strong hover:bg-surface-2",
          )}
        >
          {t(r)}
        </Link>
      ))}
    </nav>
  );
}

/** Amount without the currency, compact from 100k so it fits a phone tile. */
export function compactAmount(amount: number, locale: string) {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "ro-MD", amount < 100_000 ? {} : { notation: "compact", maximumFractionDigits: 2 }).format(amount);
}

export function compactMDL(amount: number, locale: string) {
  return `${compactAmount(amount, locale)} MDL`;
}

type DeltaKind = "relative" | "points";

/** One headline number with its change against the previous period. */
export function KpiTile({
  label,
  value,
  unit,
  title,
  current,
  previous,
  kind = "relative",
  lowerIsBetter = false,
  hint,
}: {
  label: string;
  value: string;
  unit?: string;
  title?: string;
  current: number | null;
  previous: number | null;
  kind?: DeltaKind;
  lowerIsBetter?: boolean;
  hint?: ReactNode;
}) {
  const t = useTranslations("dashOps.overview");
  const locale = useLocale();
  const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "ro-MD", opts);

  let delta: { text: string; dir: -1 | 0 | 1 } | null = null;
  if (current !== null && previous !== null) {
    if (kind === "points") {
      const diff = (current - previous) * 100;
      delta = { text: t("pp", { value: nf({ maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(diff) }), dir: Math.sign(Math.round(diff * 10)) as -1 | 0 | 1 };
    } else if (previous > 0) {
      const ratio = (current - previous) / previous;
      delta = { text: nf({ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(ratio), dir: Math.sign(Math.round(ratio * 1000)) as -1 | 0 | 1 };
    }
  }
  const good = delta ? (lowerIsBetter ? delta.dir < 0 : delta.dir > 0) : false;
  const Icon = delta && delta.dir < 0 ? ArrowDownRight : ArrowUpRight;

  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <p className="truncate text-sm text-muted">{label}</p>
      <p className="font-display truncate text-xl leading-tight font-semibold tracking-tight sm:text-2xl" title={title}>
        {value}
        {unit ? <span className="ml-1 font-sans text-sm font-medium tracking-normal text-muted">{unit}</span> : null}
      </p>
      <div className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {delta ? (
          <span className={cn("tabular inline-flex items-center gap-0.5 font-medium", delta.dir === 0 ? "text-muted" : good ? "text-success" : "text-danger")}>
            {delta.dir === 0 ? null : <Icon size={13} weight="bold" />}
            {delta.text}
          </span>
        ) : (
          <span className="text-subtle">{t("noCompare")}</span>
        )}
        {hint ? <span className="truncate text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}

/** Ranked horizontal bars, one hue, value at the tip. */
export function RankedBars({ rows, empty }: { rows: Array<{ key: string | number; label: ReactNode; value: number; display: string; detail?: string }>; empty: ReactNode }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  if (!rows.length || max === 0) return <p className="py-8 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((r) => (
        <li key={r.key} className="flex flex-col gap-1.5" title={r.detail}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 truncate">{r.label}</span>
            <span className="tabular shrink-0 font-medium">{r.display}</span>
          </div>
          <div className="h-2.5">
            <div className="h-full rounded-r-[4px] bg-accent" style={{ width: `${Math.max(1.5, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const HOURS = Array.from({ length: 10 }, (_, i) => 10 + i);
const ISO_DAYS = [1, 2, 3, 4, 5, 6, 7];

/** Weekday × hour counts on a single-hue ramp from surface-2 to accent. */
export function Heatmap({ cells }: { cells: Overview["heat"] }) {
  const t = useTranslations("dashOps.overview.heatmap");
  const tDays = useTranslations("common.weekdays");
  const short = tDays.raw("short") as string[];
  const long = tDays.raw("long") as string[];
  const byKey = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.n]));
  const max = Math.max(0, ...cells.filter((c) => c.hour >= 10 && c.hour <= 19).map((c) => c.n));
  const shade = (n: number) => (n === 0 || max === 0 ? "var(--surface-2)" : `color-mix(in oklch, var(--accent) ${Math.round(12 + (n / max) * 88)}%, var(--surface-2))`);

  return (
    <div>
      <table className="w-full table-fixed border-separate border-spacing-[3px]">
        <thead>
          <tr>
            <th className="w-8" aria-hidden />
            {HOURS.map((h) => (
              <th key={h} scope="col" className="tabular pb-1 text-center text-[10px] font-normal text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ISO_DAYS.map((d) => (
            <tr key={d}>
              <th scope="row" className="pr-1 text-left text-[11px] font-normal text-muted">
                {short[d % 7]}
              </th>
              {HOURS.map((h) => {
                const n = byKey.get(`${d}-${h}`) ?? 0;
                const label = t("cell", { day: long[d % 7], hour: `${h}:00`, count: n });
                return (
                  <td key={h} className="p-0">
                    <div
                      className="aspect-square max-h-9 w-full rounded-[4px] transition-[outline] hover:outline-2 hover:outline-fg/40"
                      style={{ background: shade(n) }}
                      title={label}
                      aria-label={label}
                      role="img"
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-2 text-[11px] text-muted">
        {t("less")}
        <span className="flex gap-[3px]">
          {[0, 0.25, 0.5, 0.75, 1].map((s) => (
            <span key={s} className="size-3 rounded-[3px]" style={{ background: shade(s * Math.max(1, max)) }} />
          ))}
        </span>
        {t("more")}
      </div>
    </div>
  );
}

function UtilMeter({ value }: { value: number | null }) {
  const locale = useLocale();
  if (value === null) return <span className="text-subtle">-</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <span className="tabular w-10 text-right">{new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "ro-MD", { style: "percent", maximumFractionDigits: 0 }).format(value)}</span>
      <span className="hidden h-1.5 w-14 overflow-hidden rounded-full bg-surface-3 sm:block">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </span>
    </span>
  );
}

export function Leaderboard({ rows, locations }: { rows: Overview["leaderboard"]; locations: Array<{ id: number; name: Localized }> }) {
  const t = useTranslations("dashOps.overview.leaderboard");
  const locale = useLocale();
  const branch = (id: number) => t9n(locations.find((l) => l.id === id)?.name, locale);

  if (!rows.length) return <p className="py-8 text-center text-sm text-muted">{t("empty")}</p>;

  return (
    <>
      <div className="-mx-5 hidden md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr className="border-b border-line">
              <th className="w-12 py-2 pl-5 font-medium">#</th>
              <th className="py-2 pr-3 font-medium">{t("barber")}</th>
              <th className="py-2 pr-3 font-medium">{t("branch")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("revenue")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("appointments")}</th>
              <th className="py-2 pr-3 text-right font-medium">{t("avgTicket")}</th>
              <th className="py-2 pr-5 text-right font-medium">{t("utilization")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td className="tabular py-2.5 pl-5 text-muted">{i + 1}</td>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2.5">
                    <Avatar src={r.photo} name={r.name} size={32} />
                    <span className="font-medium">{r.name}</span>
                    <LevelBadge level={r.level} />
                  </span>
                </td>
                <td className="py-2.5 pr-3 text-muted">{branch(r.locationId)}</td>
                <td className="tabular py-2.5 pr-3 text-right font-medium">{formatMDL(r.revenue, locale)}</td>
                <td className="tabular py-2.5 pr-3 text-right">{r.appointments}</td>
                <td className="tabular py-2.5 pr-3 text-right">{formatMDL(r.avgTicket, locale)}</td>
                <td className="py-2.5 pr-5 text-right">
                  <UtilMeter value={r.utilization} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className="-mx-4 divide-y divide-line md:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span className="tabular w-5 shrink-0 text-sm text-muted">{i + 1}</span>
            <Avatar src={r.photo} name={r.name} size={40} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate font-medium">{r.name}</span>
                <LevelBadge level={r.level} />
              </p>
              <p className="truncate text-xs text-muted">{branch(r.locationId)}</p>
              <p className="tabular text-xs text-muted">{t("short", { count: r.appointments, avg: formatMDL(r.avgTicket, locale) })}</p>
            </div>
            <div className="shrink-0 text-right text-sm">
              <p className="tabular font-medium">{formatMDL(r.revenue, locale)}</p>
              <p className="text-xs text-muted">
                <UtilMeter value={r.utilization} />
              </p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
}
