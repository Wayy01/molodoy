"use server";

import { eq } from "drizzle-orm";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const DUMMY_HASH = "$2b$11$AyssBSMa1ZboXU9zfD.8iO2kfhkB0TGron/.80ts4Q6/AY7X3uRvy";

export type LoginState = { error?: "invalid" } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "invalid" };

  const user = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });
  // Compare even when the user is missing so response time doesn't reveal which emails exist.
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !user.active || !ok) return { error: "invalid" };

  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await createSession(user.id);
  redirect({ href: "/dashboard", locale: await getLocale() });
}

export async function logout() {
  await destroySession();
  redirect({ href: "/login", locale: await getLocale() });
}
