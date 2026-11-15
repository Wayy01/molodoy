import type { AppointmentStatus, BarberLevel, Localized, WeeklyHours } from "@/db/schema";

/** One appointment as every ops screen (calendar, list, overview, details dialog) renders it. */
export type OpsAppointment = {
  id: string;
  code: string;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  source: "online" | "phone" | "walk_in";
  price: number;
  note: string | null;
  client: { id: number; name: string; phone: string };
  service: { id: number; name: Localized; durationMin: number };
  barber: { id: number; name: string; level: BarberLevel; photo: string | null };
  location: { id: number; name: Localized };
};

export type OpsBarber = {
  id: number;
  name: string;
  level: BarberLevel;
  photo: string | null;
  locationId: number;
  workingHours: WeeklyHours;
};

export type OpsService = {
  id: number;
  name: Localized;
  durationMin: number;
  priceBarber: number | null;
  pricePro: number | null;
  priceTop: number | null;
};

export type OpsTimeOff = { id: number; barberId: number; startsAt: Date; endsAt: Date; reason: string | null };

export type ClientHit = { id: number; name: string; phone: string; visits: number };

export type ActionError = "invalid" | "forbidden" | "slotTaken" | "notStarted" | "notFound" | "generic";
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: ActionError; fields?: Record<string, string> };

export const MANUAL_SOURCES = ["phone", "walk_in"] as const;
