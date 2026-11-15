import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";
import { redirect } from "@/i18n/navigation";

const COOKIE = "molodoy_session";
const MAX_AGE = 60 * 60 * 24 * 30;
const secret = new TextEncoder().encode(process.env.AUTH_SECRET);

export type SessionUser = Pick<User, "id" | "email" | "name" | "role" | "locationId" | "barberId">;

export function hashPassword(password: string) {
  return bcrypt.hash(password, 11);
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

/** The signed-in staff member, re-read from the DB so deactivated accounts lose access immediately. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const id = Number(payload.sub);
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, id), eq(users.active, true)),
      columns: { id: true, email: true, name: true, role: true, locationId: true, barberId: true },
    });
    return user ?? null;
  } catch {
    return null;
  }
});

/** Use at the top of every dashboard page and server action. */
export async function requireUser(roles?: Role[]) {
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale: await getLocale() });
  if (roles && !roles.includes(user.role)) return redirect({ href: "/dashboard", locale: await getLocale() });
  return user;
}

export type Scope = {
  /** null = every location */
  locationIds: number[] | null;
  /** set for barbers: they only ever see their own chair */
  barberId: number | null;
};

export function scopeFor(user: SessionUser): Scope {
  if (user.role === "owner") return { locationIds: null, barberId: null };
  if (user.role === "manager") return { locationIds: user.locationId ? [user.locationId] : [], barberId: null };
  return { locationIds: null, barberId: user.barberId ?? -1 };
}
