import type { BarberLevel, Localized } from "@/db/schema";

export type BookingLocation = { id: number; slug: string; name: Localized; address: Localized; photo: string | null; barbers: number };
export type BookingBarber = { id: number; slug: string; name: string; photo: string | null; level: BarberLevel; locationId: number };
export type BookingService = {
  id: number;
  slug: string;
  name: Localized;
  description: Localized | null;
  category: "hair" | "beard" | "combo" | "extra";
  durationMin: number;
  prices: Record<BarberLevel, number | null>;
};
export type Step = "location" | "barber" | "service" | "time" | "details";
export const STEPS: Step[] = ["location", "barber", "service", "time", "details"];
