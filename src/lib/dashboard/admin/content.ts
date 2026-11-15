import "server-only";
import { asc, desc, eq, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { barbers, media, posts, type Media } from "@/db/schema";
import type { DashboardContext } from "@/lib/dashboard/context";

export const GALLERY_KINDS = ["photo"] as const;
export const VIDEO_KINDS = ["video", "tiktok"] as const;

/**
 * Media a manager may change: unattributed items or items credited to a barber of their branch.
 * Owners may change everything (`undefined`).
 */
export function editableMedia(ctx: DashboardContext): SQL | undefined {
  if (ctx.user.role === "owner") return undefined;
  const branch = ctx.user.locationId ?? -1;
  return or(
    isNull(media.barberId),
    inArray(media.barberId, db.select({ id: barbers.id }).from(barbers).where(eq(barbers.locationId, branch))),
  );
}

export async function listMedia(ctx: DashboardContext, kinds: ReadonlyArray<Media["kind"]>) {
  const [items, team] = await Promise.all([
    db
      .select({ item: media, barberName: barbers.name, barberLocationId: barbers.locationId })
      .from(media)
      .leftJoin(barbers, eq(barbers.id, media.barberId))
      .where(inArray(media.kind, [...kinds]))
      .orderBy(asc(media.sortOrder), asc(media.id)),
    listBarberOptions(ctx),
  ]);
  const branch = ctx.user.role === "owner" ? null : (ctx.user.locationId ?? -1);
  return {
    items: items.map(({ item, barberName, barberLocationId }) => ({
      ...item,
      barberName,
      editable: branch === null || item.barberId === null || barberLocationId === branch,
    })),
    barbers: team,
  };
}

export type MediaItem = Awaited<ReturnType<typeof listMedia>>["items"][number];

/** Barbers a piece of content can be credited to: every barber for owners, own branch for managers. */
export function listBarberOptions(ctx: DashboardContext) {
  return db
    .select({ id: barbers.id, name: barbers.name })
    .from(barbers)
    .where(ctx.user.role === "owner" ? undefined : eq(barbers.locationId, ctx.user.locationId ?? -1))
    .orderBy(asc(barbers.name));
}

export async function listPosts() {
  const rows = await db
    .select({ id: posts.id, slug: posts.slug, title: posts.title, status: posts.status, publishedAt: posts.publishedAt, cover: posts.cover, updatedAt: posts.updatedAt })
    .from(posts)
    .orderBy(desc(posts.updatedAt));
  const now = Date.now();
  // Published with a future date: the site hides it until then.
  return rows.map((r) => ({ ...r, scheduled: r.status === "published" && !!r.publishedAt && +r.publishedAt > now }));
}

export function getPost(id: number) {
  return db.query.posts.findFirst({ where: eq(posts.id, id) });
}
