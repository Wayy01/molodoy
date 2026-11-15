"use server";

import { and, eq, ne } from "drizzle-orm";
import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { appointments, clients } from "@/db/schema";
import { getDashboardContext, type DashboardContext } from "@/lib/dashboard/context";
import { normalizePhone } from "@/lib/utils";
import { fail, invalid, ok, type Result } from "../result";
import { idSchema, optionalEmail, optionalText, requiredText } from "../validation";

const ClientSchema = z.object({
  id: idSchema,
  name: requiredText(100),
  phone: z
    .string()
    .trim()
    .min(1, "required")
    .transform(normalizePhone)
    .refine((p) => /^\+\d{8,15}$/.test(p), "invalidPhone"),
  email: optionalEmail,
  notes: optionalText(2000),
});

/** Owners see every client; managers and barbers only clients they have served. */
async function canSeeClient(ctx: DashboardContext, clientId: number) {
  if (ctx.user.role === "owner") return true;
  const served = await db.query.appointments.findFirst({
    columns: { id: true },
    where: and(
      eq(appointments.clientId, clientId),
      ctx.barber ? eq(appointments.barberId, ctx.barber.id) : eq(appointments.locationId, ctx.user.locationId ?? -1),
    ),
  });
  return !!served;
}

export async function updateClient(input: z.input<typeof ClientSchema>): Promise<Result> {
  const ctx = await getDashboardContext();
  const parsed = ClientSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;

  const [visible, taken] = await Promise.all([
    canSeeClient(ctx, id),
    db.query.clients.findFirst({ columns: { id: true }, where: and(eq(clients.phone, data.phone), ne(clients.id, id)) }),
  ]);
  if (!visible) return fail("forbidden");
  if (taken) return fail("invalid", { phone: "phoneTaken" });

  await db
    .update(clients)
    .set({ name: data.name, phone: data.phone, email: data.email || null, notes: data.notes || null })
    .where(eq(clients.id, id));
  refresh();
  return ok();
}
