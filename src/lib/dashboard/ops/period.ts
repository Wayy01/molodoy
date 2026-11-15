import { addDays, dateKey } from "@/lib/time";

export const RANGES = ["today", "7d", "30d", "90d", "month"] as const;
export type RangeKey = (typeof RANGES)[number];

export type Period = {
  range: RangeKey;
  today: string;
  /** Actuals window, inclusive date keys. Always ends today. */
  from: string;
  to: string;
  /** The chart runs to the end of the month for "month" so the rest of it shows as expected revenue. */
  chartTo: string;
  /** Equal-length window right before `from`. */
  prevFrom: string;
  prevTo: string;
  days: number;
  bucket: "hour" | "day" | "week";
};

export function daysBetween(from: string, to: string) {
  const [a, b] = [from, to].map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y, m - 1, day);
  });
  return Math.round((b - a) / 86_400_000);
}

export function parseRange(value: string | string[] | undefined): RangeKey {
  return RANGES.includes(value as RangeKey) ? (value as RangeKey) : "30d";
}

export function getPeriod(range: RangeKey, today = dateKey()): Period {
  let from = today;
  let chartTo = today;
  if (range === "7d") from = addDays(today, -6);
  if (range === "30d") from = addDays(today, -29);
  if (range === "90d") from = addDays(today, -89);
  if (range === "month") {
    from = `${today.slice(0, 8)}01`;
    const [y, m] = today.split("-").map(Number);
    chartTo = `${today.slice(0, 8)}${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  }
  const days = daysBetween(from, today) + 1;
  return {
    range,
    today,
    from,
    to: today,
    chartTo,
    prevFrom: addDays(from, -days),
    prevTo: addDays(from, -1),
    days,
    bucket: range === "today" ? "hour" : range === "90d" ? "week" : "day",
  };
}
