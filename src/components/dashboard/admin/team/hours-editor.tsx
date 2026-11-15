"use client";

import { useTranslations } from "next-intl";
import { Select } from "@/components/ui/field";
import type { WeeklyHours } from "@/db/schema";
import { hhmm } from "@/lib/time";
import { Switch } from "../switch";
import { WEEK_ORDER } from "./work-days";

/** "06:00" ... "23:30" in 30-minute steps. */
export const HALF_HOURS = Array.from({ length: 36 }, (_, i) => hhmm(360 + i * 30));

/** Keeps a stored value selectable even when it is off the 30-minute grid. */
export function timeOptions(current: string) {
  return HALF_HOURS.includes(current) ? HALF_HOURS : [...HALF_HOURS, current].sort();
}

/** Seven rows, Monday first: working toggle, then start and end. */
export function HoursEditor({
  value,
  onChange,
  errorFor,
}: {
  value: WeeklyHours;
  onChange: (next: WeeklyHours) => void;
  errorFor: (day: number) => string | undefined;
}) {
  const t = useTranslations("dashAdmin.hours");
  const tWeek = useTranslations("common.weekdays");
  const names = tWeek.raw("long") as string[];

  function setDay(day: number, next: WeeklyHours[number]) {
    onChange(value.map((d, i) => (i === day ? next : d)));
  }

  return (
    <div className="-my-1 divide-y divide-line">
      {WEEK_ORDER.map((day) => {
        const hours = value[day];
        // Turning a day on copies the hours of an existing working day, so a typical week takes few taps.
        const template = value.find((d) => d !== null) ?? { start: "10:00", end: "20:00" };
        const error = errorFor(day);
        return (
          <div key={day} className="flex flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:gap-4">
            <Switch
              checked={!!hours}
              onChange={(on) => setDay(day, on ? { ...template } : null)}
              label={names[day]}
              description={hours ? undefined : t("dayOff")}
              className="sm:w-60 sm:flex-none"
            />
            {hours ? (
              <div className="flex flex-col gap-1.5 sm:flex-1">
                <div className="grid grid-cols-2 gap-2">
                  <label className="sr-only" htmlFor={`start-${day}`}>
                    {t("start")}
                  </label>
                  <Select
                    id={`start-${day}`}
                    value={hours.start}
                    onChange={(e) => setDay(day, { ...hours, start: e.target.value })}
                    className="tabular"
                    aria-invalid={!!error}
                  >
                    {timeOptions(hours.start).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                  <label className="sr-only" htmlFor={`end-${day}`}>
                    {t("end")}
                  </label>
                  <Select
                    id={`end-${day}`}
                    value={hours.end}
                    onChange={(e) => setDay(day, { ...hours, end: e.target.value })}
                    className="tabular"
                    aria-invalid={!!error}
                  >
                    {timeOptions(hours.end).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </Select>
                </div>
                {error ? (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
