import "server-only";

/** Thumbnail for a TikTok video link via the public oEmbed endpoint, cached for a day. */
export async function tiktokThumbnail(url: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail_url?: string };
    return data.thumbnail_url ?? null;
  } catch {
    return null;
  }
}
