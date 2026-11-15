"use server";

import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings, type SiteSettings } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard/context";
import { revalidatePublicSite } from "@/lib/revalidate";
import { normalizePhone } from "@/lib/utils";
import { fail, invalid, ok, type Result } from "../result";
import { DEMO_CONFIRM_WORD } from "../constants";
import { optionalEmail } from "../validation";

const socialUrl = (host: RegExp) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (v.startsWith("https://") && URL.canParse(v) && host.test(new URL(v).hostname)), "invalidUrl");

const SettingsSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, "required")
    .transform(normalizePhone)
    .refine((p) => /^\+\d{8,15}$/.test(p), "invalidPhone"),
  email: optionalEmail,
  instagram: socialUrl(/(^|\.)instagram\.com$/),
  tiktok: socialUrl(/(^|\.)tiktok\.com$/),
  facebook: socialUrl(/(^|\.)(facebook\.com|fb\.com)$/),
  bookingHorizonDays: z.number("invalid").int("invalid").min(1, "horizonRange").max(60, "horizonRange"),
  slotStepMin: z.number("invalid").refine((v) => v === 15 || v === 30, "invalid"),
  firstVisitDiscount: z.number("invalid").int("invalid").min(0, "invalid").max(10_000, "invalid"),
}) satisfies z.ZodType<SiteSettings, unknown>;

export async function saveSettings(input: z.input<typeof SettingsSchema>): Promise<Result> {
  await getDashboardContext(["owner"]);
  const parsed = SettingsSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  await db
    .insert(settings)
    .values({ key: "site", value: parsed.data })
    .onConflictDoUpdate({ target: settings.key, set: { value: parsed.data } });
  revalidatePublicSite();
  return ok();
}

/** Drops generated sales data, keeping real bookings and any demo client who has since booked for real. */
export async function deleteDemoData(confirmation: string): Promise<Result<{ appointments: number; clients: number }>> {
  await getDashboardContext(["owner"]);
  if (confirmation.trim().toUpperCase() !== DEMO_CONFIRM_WORD) return fail("invalid", { confirm: "confirmMismatch" });

  const result = await db.transaction(async (tx) => {
    const a = await tx.execute(sql`DELETE FROM molodoy.appointments WHERE demo = true`);
    const c = await tx.execute(sql`DELETE FROM molodoy.clients c WHERE demo = true
      AND NOT EXISTS (SELECT 1 FROM molodoy.appointments a WHERE a.client_id = c.id)`);
    return { appointments: a.count, clients: c.count };
  });
  revalidatePublicSite();
  return ok(result);
}
