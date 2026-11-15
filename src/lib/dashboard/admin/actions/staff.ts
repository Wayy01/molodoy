"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { barbers, locations, users, type User } from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { getDashboardContext, type DashboardContext } from "@/lib/dashboard/context";
import { generatePassword } from "../password";
import { fail, invalid, ok, type Result } from "../result";
import { emailSchema, idSchema, requiredText } from "../validation";

/** Owners manage every account; managers only the logins of barbers in their branch. */
async function manageableUser(ctx: DashboardContext, userId: number) {
  const user = await db.query.users.findFirst({ where: eq(users.id, idSchema.parse(userId)) });
  if (!user) return null;
  if (ctx.user.role === "owner") return user;
  if (user.role !== "barber" || !user.barberId) return null;
  const barber = await db.query.barbers.findFirst({ where: eq(barbers.id, user.barberId), columns: { locationId: true } });
  return barber && barber.locationId === ctx.user.locationId ? user : null;
}

export async function resetPassword(userId: number): Promise<Result<{ email: string; password: string }>> {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const user = await manageableUser(ctx, userId);
  if (!user) return fail("forbidden");

  const password = generatePassword();
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(users.id, user.id));
  return ok({ email: user.email, password });
}

export async function setUserActive(userId: number, active: boolean): Promise<Result> {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const user = await manageableUser(ctx, userId);
  if (!user) return fail("forbidden");
  if (user.id === ctx.user.id) return fail("cannotDeactivateSelf");

  await db.update(users).set({ active: z.boolean().parse(active) }).where(eq(users.id, user.id));
  refresh();
  return ok();
}

const StaffSchema = z
  .object({
    name: requiredText(80),
    email: emailSchema,
    role: z.enum(["manager", "owner"] satisfies Array<User["role"]>),
    locationId: idSchema.nullable(),
  })
  .refine((s) => s.role === "owner" || s.locationId !== null, { path: ["locationId"], message: "required" });

/** Owner only: adds a manager (bound to a branch) or another owner. */
export async function createStaff(input: z.input<typeof StaffSchema>): Promise<Result<{ email: string; password: string }>> {
  await getDashboardContext(["owner"]);
  const parsed = StaffSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const data = parsed.data;

  const [emailOwner, location] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.email, data.email), columns: { id: true } }),
    data.locationId ? db.query.locations.findFirst({ where: eq(locations.id, data.locationId), columns: { id: true } }) : null,
  ]);
  if (emailOwner) return fail("invalid", { email: "emailTaken" });
  if (data.role === "manager" && !location) return fail("invalid", { locationId: "required" });

  const password = generatePassword();
  await db.insert(users).values({
    name: data.name,
    email: data.email,
    role: data.role,
    locationId: data.role === "manager" ? data.locationId : null,
    passwordHash: await hashPassword(password),
  });
  refresh();
  return ok({ email: data.email, password });
}
