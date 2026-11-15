"use server";

import { eq, like } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { appointments, locations, serviceCategoryEnum, services } from "@/db/schema";
import { getDashboardContext } from "@/lib/dashboard/context";
import { isMapEmbedUrl } from "@/lib/maps";
import { revalidatePublicSite } from "@/lib/revalidate";
import { minutesOf } from "@/lib/time";
import { normalizePhone, slugify } from "@/lib/utils";
import { fail, invalid, ok, type Result } from "../result";
import { idSchema, localizedOptional, localizedRequired, priceSchema, timeSchema, uploadPath } from "../validation";

const ServiceSchema = z
  .object({
    id: idSchema.nullable(),
    name: localizedRequired(80),
    description: localizedOptional(400),
    category: z.enum(serviceCategoryEnum.enumValues),
    durationMin: z.number("invalid").int("invalid").min(15, "durationStep").max(480, "durationStep").multipleOf(15, "durationStep"),
    priceBarber: priceSchema,
    pricePro: priceSchema,
    priceTop: priceSchema,
    active: z.boolean(),
    sortOrder: z.number("invalid").int("invalid").min(0).max(9999),
  })
  .refine((s) => s.priceBarber !== null || s.pricePro !== null || s.priceTop !== null, { path: ["prices"], message: "pricesRequired" });

/** First free "base", "base-2", "base-3"... among existing service slugs. */
async function uniqueServiceSlug(base: string) {
  const taken = new Set(
    (await db.select({ slug: services.slug }).from(services).where(like(services.slug, `${base}%`))).map((r) => r.slug),
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export async function saveService(input: z.input<typeof ServiceSchema>): Promise<Result> {
  await getDashboardContext(["owner"]);
  const parsed = ServiceSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;
  const values = { ...data, description: data.description.ro || data.description.ru ? data.description : null };

  if (id) {
    const [row] = await db.update(services).set(values).where(eq(services.id, id)).returning({ id: services.id });
    if (!row) return fail("notFound");
  } else {
    const slug = await uniqueServiceSlug(slugify(data.name.ro) || "serviciu");
    await db.insert(services).values({ ...values, slug });
  }
  revalidatePublicSite();
  return ok();
}

export async function deleteService(id: number): Promise<Result> {
  await getDashboardContext(["owner"]);
  const serviceId = idSchema.parse(id);
  // Past appointments keep pointing at the service; those can only be hidden.
  const used = await db.query.appointments.findFirst({ where: eq(appointments.serviceId, serviceId), columns: { id: true } });
  if (used) return fail("serviceInUse");
  await db.delete(services).where(eq(services.id, serviceId));
  revalidatePublicSite();
  return ok();
}

/** Accepts the embed URL or the whole <iframe> snippet Google Maps hands out. */
const mapEmbedSchema = z
  .string()
  .trim()
  .transform((v) => v.match(/src=["']([^"']+)["']/)?.[1] ?? v)
  .refine((v) => v === "" || isMapEmbedUrl(v), "invalidMapEmbed")
  .transform((v) => v || null);

const httpsUrl = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "invalidUrl")
  .transform((v) => v || null);

const LocationSchema = z
  .object({
    id: idSchema,
    name: localizedRequired(60),
    address: localizedRequired(160),
    phone: z
      .string()
      .trim()
      .min(1, "required")
      .transform(normalizePhone)
      .refine((p) => /^\+\d{8,15}$/.test(p), "invalidPhone"),
    opensAt: timeSchema,
    closesAt: timeSchema,
    mapEmbedUrl: mapEmbedSchema,
    mapLink: httpsUrl,
    photo: uploadPath.nullable(),
    active: z.boolean(),
    sortOrder: z.number("invalid").int("invalid").min(0).max(9999),
  })
  .refine((l) => minutesOf(l.opensAt) < minutesOf(l.closesAt), { path: ["closesAt"], message: "endBeforeStart" });

export async function saveLocation(input: z.input<typeof LocationSchema>): Promise<Result> {
  await getDashboardContext(["owner"]);
  const parsed = LocationSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, ...data } = parsed.data;

  const [row] = await db.update(locations).set(data).where(eq(locations.id, id)).returning({ id: locations.id });
  if (!row) return fail("notFound");
  revalidatePublicSite();
  return ok();
}
