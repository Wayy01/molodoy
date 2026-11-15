"use client";

import { useFormatter, useTranslations } from "next-intl";

/** "Azi 14:30", "Mâine 10:00", "Vi, 21 nov. 12:00" */
export function useWhenLabel() {
  const format = useFormatter();
  const t = useTranslations("common.time");
  return (date: string, time?: string, today?: string) => {
    const now = today ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Chisinau" }).format(new Date());
    const tomorrow = new Date(`${now}T12:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const day =
      date === now
        ? t("today")
        : date === tomorrow.toISOString().slice(0, 10)
          ? t("tomorrow")
          : format.dateTime(new Date(`${date}T12:00:00Z`), { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return time ? `${day}, ${time}` : day;
  };
}
