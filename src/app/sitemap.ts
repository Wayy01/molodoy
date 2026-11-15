import type { MetadataRoute } from "next";
import { getBarbers, getPublishedPosts } from "@/lib/data";

const BASE = process.env.SITE_URL ?? "https://molodoybarbershop.md";
const STATIC = ["", "/book", "/team", "/prices", "/work", "/locations", "/blog"];

// Built per request: a revalidated sitemap would be prerendered during `next build`, which has no database.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [barbers, posts] = await Promise.all([getBarbers(), getPublishedPosts()]);
  const paths = [...STATIC, ...barbers.map((b) => `/team/${b.slug}`), ...posts.map((p) => `/blog/${p.slug}`)];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    alternates: { languages: { ro: `${BASE}${path}`, ru: `${BASE}/ru${path}` } },
  }));
}
