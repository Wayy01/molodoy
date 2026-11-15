import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { barbers, locations, media, posts, services, settings, type SiteSettings } from "@/db/schema";

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: "+37361090123",
  email: "",
  instagram: "",
  tiktok: "",
  facebook: "",
  bookingHorizonDays: 14,
  slotStepMin: 30,
  firstVisitDiscount: 50,
};

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const row = await db.query.settings.findFirst({ where: eq(settings.key, "site") });
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<SiteSettings> | undefined) };
});

export const getLocations = cache(async () => {
  return db.query.locations.findMany({
    where: eq(locations.active, true),
    orderBy: [asc(locations.sortOrder), asc(locations.id)],
  });
});

export const getLocationBySlug = cache(async (slug: string) => {
  return db.query.locations.findFirst({ where: and(eq(locations.slug, slug), eq(locations.active, true)) });
});

const LEVEL_RANK = { top: 0, pro: 1, barber: 2 } as const;

export const getBarbers = cache(async (locationId?: number) => {
  const rows = await db
    .select({ barber: barbers, location: locations })
    .from(barbers)
    .innerJoin(locations, eq(locations.id, barbers.locationId))
    .where(
      and(
        eq(barbers.active, true),
        eq(locations.active, true),
        locationId ? eq(barbers.locationId, locationId) : undefined,
      ),
    )
    .orderBy(asc(locations.sortOrder), asc(barbers.sortOrder), asc(barbers.name));
  return rows
    .map((r) => ({ ...r.barber, location: r.location }))
    .sort((a, b) => a.location.sortOrder - b.location.sortOrder || LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || a.sortOrder - b.sortOrder);
});

export type BarberWithLocation = Awaited<ReturnType<typeof getBarbers>>[number];

export const getBarberBySlug = cache(async (slug: string) => {
  const [row] = await db
    .select({ barber: barbers, location: locations })
    .from(barbers)
    .innerJoin(locations, eq(locations.id, barbers.locationId))
    .where(and(eq(barbers.slug, slug), eq(barbers.active, true)))
    .limit(1);
  return row ? { ...row.barber, location: row.location } : undefined;
});

export const getServices = cache(async () => {
  return db.query.services.findMany({
    where: eq(services.active, true),
    orderBy: [asc(services.sortOrder), asc(services.id)],
  });
});

export const getMedia = cache(
  async (opts: { kinds?: Array<"photo" | "video" | "tiktok">; barberId?: number; featured?: boolean; limit?: number } = {}) => {
    return db.query.media.findMany({
      where: and(
        opts.kinds ? inArray(media.kind, opts.kinds) : undefined,
        opts.barberId ? eq(media.barberId, opts.barberId) : undefined,
        opts.featured ? eq(media.featured, true) : undefined,
      ),
      orderBy: [desc(media.featured), asc(media.sortOrder), desc(media.createdAt)],
      limit: opts.limit,
    });
  },
);

export const getPublishedPosts = cache(async (limit?: number) => {
  return db.query.posts.findMany({
    where: and(eq(posts.status, "published"), isNotNull(posts.publishedAt), lte(posts.publishedAt, new Date())),
    orderBy: [desc(posts.publishedAt)],
    limit,
  });
});

export const getPostBySlug = cache(async (slug: string) => {
  return db.query.posts.findFirst({
    where: and(eq(posts.slug, slug), eq(posts.status, "published"), lte(posts.publishedAt, new Date())),
  });
});
