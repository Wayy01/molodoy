"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { LOCATION_COOKIE, THEME_COOKIE, type DashboardTheme } from "@/lib/dashboard/context";

const YEAR = 60 * 60 * 24 * 365;

export async function setLocationFilter(locationId: number | null) {
  await requireUser();
  const jar = await cookies();
  if (locationId) jar.set(LOCATION_COOKIE, String(locationId), { path: "/", maxAge: YEAR, sameSite: "lax" });
  else jar.delete(LOCATION_COOKIE);
}

export async function setDashboardTheme(theme: DashboardTheme) {
  await requireUser();
  (await cookies()).set(THEME_COOKIE, theme, { path: "/", maxAge: YEAR, sameSite: "lax" });
}
