"use server";

import { and, asc, eq, inArray, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { barbers, media, postStatusEnum, posts, type Media } from "@/db/schema";
import { getDashboardContext, type DashboardContext } from "@/lib/dashboard/context";
import { revalidatePublicSite } from "@/lib/revalidate";
import { zoned } from "@/lib/time";
import { editableMedia, GALLERY_KINDS, VIDEO_KINDS } from "../content";
import { fail, invalid, ok, type Result } from "../result";
import { idSchema, localizedOptional, slugSchema, uploadPath } from "../validation";

const ADMIN = ["owner", "manager"] as const;

const captionSchema = localizedOptional(200).transform((c) => (c.ro || c.ru ? c : null));

/** https://www.tiktok.com/@user/video/1234567890 (query string dropped). */
const tiktokSchema = z
  .string()
  .trim()
  .transform((v) => v.match(/^https:\/\/(?:www\.|m\.)?tiktok\.com\/(@[\w.-]+)\/video\/(\d+)/))
  .refine((m) => m !== null, "invalidTiktok")
  .transform((m) => `https://www.tiktok.com/${m![1]}/video/${m![2]}`);

function groupOf(kind: Media["kind"]): ReadonlyArray<Media["kind"]> {
  return kind === "photo" ? GALLERY_KINDS : VIDEO_KINDS;
}

/** Managers may only credit barbers of their own branch. */
async function barberAllowed(ctx: DashboardContext, barberId: number | null) {
  if (barberId === null) return true;
  const barber = await db.query.barbers.findFirst({ where: eq(barbers.id, barberId), columns: { locationId: true } });
  return !!barber && (ctx.user.role === "owner" || barber.locationId === ctx.user.locationId);
}

async function findEditable(ctx: DashboardContext, id: number) {
  return db.query.media.findFirst({ where: and(eq(media.id, idSchema.parse(id)), editableMedia(ctx)) });
}

async function nextSortOrder(kinds: ReadonlyArray<Media["kind"]>) {
  const [row] = await db
    .select({ max: sql<number>`coalesce(max(${media.sortOrder}), 0)::int` })
    .from(media)
    .where(inArray(media.kind, [...kinds]));
  return row.max + 10;
}

const PhotosSchema = z
  .array(z.object({ src: uploadPath, width: z.number().int().positive().nullable(), height: z.number().int().positive().nullable() }))
  .min(1)
  .max(40);

export async function addPhotos(input: z.input<typeof PhotosSchema>): Promise<Result<{ count: number }>> {
  await getDashboardContext([...ADMIN]);
  const parsed = PhotosSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const start = await nextSortOrder(GALLERY_KINDS);
  await db.insert(media).values(parsed.data.map((p, i) => ({ kind: "photo" as const, ...p, sortOrder: start + i * 10 })));
  revalidatePublicSite();
  return ok({ count: parsed.data.length });
}

const NewVideoSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("video"),
    src: uploadPath,
    poster: uploadPath.nullable(),
    caption: captionSchema,
    barberId: idSchema.nullable(),
    featured: z.boolean(),
  }),
  z.object({
    kind: z.literal("tiktok"),
    src: tiktokSchema,
    caption: captionSchema,
    barberId: idSchema.nullable(),
    featured: z.boolean(),
  }),
]);

export async function addVideo(input: z.input<typeof NewVideoSchema>): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const parsed = NewVideoSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  if (!(await barberAllowed(ctx, parsed.data.barberId))) return fail("invalid", { barberId: "invalid" });

  await db.insert(media).values({ ...parsed.data, sortOrder: await nextSortOrder(VIDEO_KINDS) });
  revalidatePublicSite();
  return ok();
}

const MediaUpdateSchema = z.object({
  id: idSchema,
  caption: captionSchema,
  barberId: idSchema.nullable(),
  featured: z.boolean(),
  poster: uploadPath.nullable().optional(),
});

export async function updateMedia(input: z.input<typeof MediaUpdateSchema>): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const parsed = MediaUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, poster, ...data } = parsed.data;

  const [item, barberOk] = await Promise.all([findEditable(ctx, id), barberAllowed(ctx, data.barberId)]);
  if (!item) return fail("forbidden");
  if (!barberOk) return fail("invalid", { barberId: "invalid" });

  await db
    .update(media)
    .set({ ...data, ...(item.kind === "video" && poster !== undefined ? { poster } : {}) })
    .where(eq(media.id, item.id));
  revalidatePublicSite();
  return ok();
}

export async function setMediaFeatured(id: number, featured: boolean): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const item = await findEditable(ctx, id);
  if (!item) return fail("forbidden");
  await db.update(media).set({ featured: z.boolean().parse(featured) }).where(eq(media.id, item.id));
  revalidatePublicSite();
  return ok();
}

/** Swaps an item with its neighbour, renumbering the whole group so ties in sort_order can't stall it. */
export async function moveMedia(id: number, direction: "up" | "down"): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const item = await findEditable(ctx, id);
  if (!item) return fail("forbidden");

  const group = await db
    .select({ id: media.id })
    .from(media)
    .where(inArray(media.kind, [...groupOf(item.kind)]))
    .orderBy(asc(media.sortOrder), asc(media.id));
  const ids = group.map((g) => g.id);
  const from = ids.indexOf(item.id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ok();
  [ids[from], ids[to]] = [ids[to], ids[from]];

  const values = sql.join(
    ids.map((mid, i) => sql`(${mid}::int, ${(i + 1) * 10}::int)`),
    sql`, `,
  );
  await db.execute(sql`update ${media} set sort_order = v.ord from (values ${values}) as v(id, ord) where ${media.id} = v.id`);
  revalidatePublicSite();
  return ok();
}

/** Removes the row only; the file stays on disk in case it is used elsewhere. */
export async function deleteMedia(id: number): Promise<Result> {
  const ctx = await getDashboardContext([...ADMIN]);
  const item = await findEditable(ctx, id);
  if (!item) return fail("forbidden");
  await db.delete(media).where(eq(media.id, item.id));
  revalidatePublicSite();
  return ok();
}

const PostSchema = z
  .object({
    id: idSchema.nullable(),
    slug: slugSchema,
    title: localizedOptional(160),
    excerpt: localizedOptional(400),
    body: localizedOptional(50_000),
    cover: uploadPath.nullable(),
    status: z.enum(postStatusEnum.enumValues),
    /** "YYYY-MM-DDTHH:mm" in Chișinău time, or "" for "now" when publishing. */
    publishedAt: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "invalidDate")]),
  })
  .superRefine((p, ctx) => {
    if (!p.title.ro) ctx.addIssue({ code: "custom", path: ["title", "ro"], message: "required" });
    // A published post needs both languages; drafts may be half-written.
    if (p.status !== "published") return;
    for (const field of ["title", "excerpt", "body"] as const) {
      for (const lang of ["ro", "ru"] as const) {
        if (!p[field][lang]) ctx.addIssue({ code: "custom", path: [field, lang], message: "requiredToPublish" });
      }
    }
  });

export async function savePost(input: z.input<typeof PostSchema>): Promise<Result<{ id: number }>> {
  const ctx = await getDashboardContext([...ADMIN]);
  const parsed = PostSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { id, publishedAt, ...data } = parsed.data;

  const slugOwner = await db.query.posts.findFirst({
    where: and(eq(posts.slug, data.slug), id ? ne(posts.id, id) : undefined),
    columns: { id: true },
  });
  if (slugOwner) return fail("invalid", { slug: "slugTaken" });

  const when = publishedAt ? zoned(publishedAt.slice(0, 10), publishedAt.slice(11)) : data.status === "published" ? new Date() : null;
  const values = { ...data, publishedAt: when, updatedAt: new Date() };

  let savedId: number;
  if (id) {
    const [row] = await db.update(posts).set(values).where(eq(posts.id, id)).returning({ id: posts.id });
    if (!row) return fail("notFound");
    savedId = row.id;
  } else {
    const [row] = await db
      .insert(posts)
      .values({ ...values, authorId: ctx.user.id })
      .returning({ id: posts.id });
    savedId = row.id;
  }
  revalidatePublicSite();
  return ok({ id: savedId });
}

export async function deletePost(id: number): Promise<Result> {
  await getDashboardContext([...ADMIN]);
  await db.delete(posts).where(eq(posts.id, idSchema.parse(id)));
  revalidatePublicSite();
  return ok();
}
