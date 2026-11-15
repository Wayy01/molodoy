"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { barbers, levelEnum, locations, timeOff, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { assertInScope, getDashboardContext } from "@/lib/dashboard/context";
import { revalidatePublicSite } from "@/lib/revalidate";
import { generatePassword } from "../password";
import { fail, invalid, ok, type Result } from "../result";
import { emailSchema, idSchema, localizedOptional, requiredText, slugSchema, uploadPath, weeklyHoursSchema } from "../validation";

const ADMIN = ["owner", "manager"] as const;

/** Accepts "@handle", "handle" or a profile URL; stores the profile URL. */
const instagramSchema = z
  .string()
  .trim()
  .max(200, "tooLong")
  .transform((v) =>
    v
      .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
      .replace(/^@/, "")
      .replace(/[/?#].*$/, ""),
  )
  .refine((h) => h === "" || /^[A-Za-z0-9._]{1,30}$/.test(h), "invalidInstagram")
  .transform((h) => (h ? `https://www.instagram.com/${h}/` : null));

const BarberSchema = z.object({
  id: idSchema.nullable(),
  name: requiredText(60),
  slug: slugSchema,
  level: z.enum(levelEnum.enumValues),
  locationId: idSchema,
  photo: uploadPath.nullable(),
  bio: localizedOptional(1200),
  instagram: instagramSchema,
  workingHours: weeklyHoursSchema,
  sortOrder: z.number().int().min(0).max(9999),
  active: z.boolean(),
});

export async function saveBarber(input: z.input<typeof BarberSchema>): Promise<Result<{ id: number }>> {
  const ctx = await getDashboardContext([...ADMIN]);
  const parsed = BarberSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  // Managers only staff their own branch.
  if (ctx.user.role === "manager") data.locationId = ctx.user.locationId ?? -1;
  assertInScope(ctx, { locationId: data.locationId });

  const [existing, slugOwner, location] = await Promise.all([
    id ? db.query.barbers.findFirst({ where: eq(barbers.id, id), columns: { id: true, locationId: true } }) : null,
    db.query.barbers.findFirst({ where: and(eq(barbers.slug, data.slug), id ? ne(barbers.id, id) : undefined), columns: { id: true } }),
    db.query.locations.findFirst({ where: eq(locations.id, data.locationId), columns: { id: true } }),
  ]);
  if (id && !existing) return fail("notFound");
  if (existing) assertInScope(ctx, { locationId: existing.locationId });
  if (!location) return fail("invalid", { locationId: "required" });
  if (slugOwner) return fail("invalid", { slug: "slugTaken" });

  const values = { ...data, bio: data.bio.ro || data.bio.ru ? data.bio : null };
  let savedId: number;
  if (existing) {
    await db.update(barbers).set(values).where(eq(barbers.id, existing.id));
    if (existing.locationId !== data.locationId) {
      await db.update(users).set({ locationId: data.locationId }).where(eq(users.barberId, existing.id));
    }
    savedId = existing.id;
  } else {
    const [row] = await db.insert(barbers).values(values).returning({ id: barbers.id });
    savedId = row.id;
  }

  revalidatePublicSite();
  return ok({ id: savedId });
}

export async function deleteTimeOff(id: number): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const [row] = await db
    .select({ id: timeOff.id, locationId: barbers.locationId })
    .from(timeOff)
    .innerJoin(barbers, eq(barbers.id, timeOff.barberId))
    .where(eq(timeOff.id, idSchema.parse(id)));
  if (!row) return fail("notFound");
  assertInScope(ctx, { locationId: row.locationId });

  await db.delete(timeOff).where(eq(timeOff.id, row.id));
  revalidatePublicSite();
  return ok();
}

/** Creates the barber's own login. The password is returned once and never stored in clear. */
export async function createBarberLogin(input: { barberId: number; email: string }): Promise<Result<{ email: string; password: string }>> {
  const ctx = await getDashboardContext([...ADMIN]);
  const parsed = z.object({ barberId: idSchema, email: emailSchema }).safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { barberId, email } = parsed.data;

  const [barber, emailOwner, existing] = await Promise.all([
    db.query.barbers.findFirst({ where: eq(barbers.id, barberId) }),
    db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true } }),
    db.query.users.findFirst({ where: eq(users.barberId, barberId), columns: { id: true } }),
  ]);
  if (!barber) return fail("notFound");
  assertInScope(ctx, { locationId: barber.locationId });
  if (existing) return fail("loginExists");
  if (emailOwner) return fail("invalid", { email: "emailTaken" });

  const password = generatePassword();
  await db.insert(users).values({
    email,
    name: barber.name,
    role: "barber",
    barberId: barber.id,
    locationId: barber.locationId,
    passwordHash: await hashPassword(password),
  });
  refresh();
  return ok({ email, password });
}
