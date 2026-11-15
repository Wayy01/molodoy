"use client";

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, type BarShapeProps, type TooltipContentProps } from "recharts";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { formatMDL } from "@/lib/utils";
import { zoned } from "@/lib/time";

type Point = { key: string; revenue: number; expected: number };
type Bucket = "hour" | "day" | "week";

/** Rounded 4px top only on the top-most segment; a 2px surface gap separates the two segments. */
function segment(top: (p: Point) => boolean, gapBelow: boolean) {
  function Segment({ x = 0, y = 0, width = 0, height = 0, fill, fillOpacity, payload: raw }: BarShapeProps) {
    const payload = raw as Point | undefined;
    if (!payload || height <= 0 || width <= 0) return null;
    const isTop = top(payload);
    const h = gapBelow && !isTop ? Math.max(0, height - 2) : height;
    const yy = gapBelow && !isTop ? y + 2 : y;
    const r = isTop ? Math.min(4, width / 2, h) : 0;
    const d = `M${x},${yy + h} L${x},${yy + r} Q${x},${yy} ${x + r},${yy} L${x + width - r},${yy} Q${x + width},${yy} ${x + width},${yy + r} L${x + width},${yy + h} Z`;
    return <path d={d} fill={fill} fillOpacity={fillOpacity} />;
  }
  return Segment;
}

const RevenueShape = segment((p) => p.expected === 0, true);
const ExpectedShape = segment(() => true, false);

export function RevenueChart({ data, bucket }: { data: Point[]; bucket: Bucket }) {
  const t = useTranslations("dashOps.overview.chart");
  const locale = useLocale();
  const format = useFormatter();
  const hasExpected = data.some((d) => d.expected > 0);

  const label = (key: string, long = false) => {
    if (bucket === "hour") return `${key}:00`;
    const d = zoned(key, "12:00");
    if (bucket === "week") return long ? t("weekOf", { date: format.dateTime(d, { day: "numeric", month: "long" }) }) : format.dateTime(d, { day: "numeric", month: "short" });
    return long ? format.dateTime(d, { weekday: "short", day: "numeric", month: "long" }) : format.dateTime(d, { day: "numeric", month: "short" });
  };
  const compact = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "ro-MD", { notation: "compact", maximumFractionDigits: 1 });

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    const p = payload?.[0]?.payload as Point | undefined;
    if (!active || !p) return null;
    return (
      <div className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-card">
        <p className="mb-1.5 text-muted first-letter:uppercase">{label(p.key, true)}</p>
        <p className="flex items-center gap-2">
          <span className="h-0.5 w-3 rounded-full bg-accent" />
          <span className="tabular text-sm font-semibold text-fg">{formatMDL(p.revenue, locale)}</span>
          <span className="text-muted">{t("revenue")}</span>
        </p>
        {p.expected > 0 ? (
          <p className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded-full bg-muted" />
            <span className="tabular text-sm font-semibold text-fg">{formatMDL(p.expected, locale)}</span>
            <span className="text-muted">{t("expected")}</span>
          </p>
        ) : null}
      </div>
    );
  };

  const total = data.reduce((a, d) => a + d.revenue + d.expected, 0);
  if (total === 0) return <p className="flex h-[260px] items-center justify-center text-sm text-muted lg:h-[330px]">{t("empty")}</p>;

  return (
    <div>
      {hasExpected ? (
        <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-accent" />
            {t("revenue")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-muted/40" />
            {t("expected")}
          </span>
        </div>
      ) : null}
      <div className="h-[260px] lg:h-[330px]">
        <BarChart
          data={data}
          responsive
          style={{ width: "100%", height: "100%" }}
          margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="22%"
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis
            dataKey="key"
            tickFormatter={(k: string) => label(k)}
            tickLine={false}
            axisLine={{ stroke: "var(--line-strong)" }}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            minTickGap={18}
            interval="preserveStartEnd"
            tickMargin={6}
          />
          <YAxis
            tickFormatter={(v: number) => compact.format(v)}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            width={40}
            allowDecimals={false}
          />
          <Tooltip cursor={{ fill: "var(--surface-2)" }} content={renderTooltip} isAnimationActive={false} />
          <Bar dataKey="revenue" stackId="r" fill="var(--accent)" maxBarSize={24} shape={RevenueShape} isAnimationActive={false} />
          <Bar dataKey="expected" stackId="r" fill="var(--muted)" fillOpacity={0.4} maxBarSize={24} shape={ExpectedShape} isAnimationActive={false} />
        </BarChart>
      </div>
    </div>
  );
}
