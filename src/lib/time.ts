import { TZDate } from "@date-fns/tz";
import { addDays as addDaysFn, format } from "date-fns";

export const TZ = "Europe/Chisinau";

/** "YYYY-MM-DD" for an instant, as seen in Chișinău. */
export function dateKey(d: Date | number = Date.now()) {
  return format(new TZDate(+d, TZ), "yyyy-MM-dd");
}

/** "HH:mm" for an instant, as seen in Chișinău. */
export function timeKey(d: Date | number) {
  return format(new TZDate(+d, TZ), "HH:mm");
}

export function minutesOf(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function hhmm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** The UTC instant of a Chișinău wall-clock date + time. Handles DST. */
export function zoned(date: string, time = "00:00") {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  return new Date(new TZDate(y, mo - 1, d, h, mi, 0, TZ).getTime());
}

export function addDays(date: string, n: number) {
  const [y, mo, d] = date.split("-").map(Number);
  return format(addDaysFn(new Date(y, mo - 1, d), n), "yyyy-MM-dd");
}

/** 0 = Sunday, matching WeeklyHours indexing. */
export function weekday(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d).getDay();
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string) {
  const wd = weekday(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function isValidDate(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}
