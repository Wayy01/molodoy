import type { MetadataRoute } from "next";
import { getBarbers, getPublishedPosts } from "@/lib/data";

const BASE = process.env.SITE_URL ?? "https://molodoybarbershop.md";
const STATIC = ["", "/book", "/team", "/prices", "/work", "/locations", "/blog"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [barbers, posts] = await Promise.all([getBarbers(), getPublishedPosts()]);
  const paths = [...STATIC, ...barbers.map((b) => `/team/${b.slug}`), ...posts.map((p) => `/blog/${p.slug}`)];
  return paths.map((path) => ({
    url: `${BASE}${path}`,
    alternates: { languages: { ro: `${BASE}${path}`, ru: `${BASE}/ru${path}` } },
  }));
}
