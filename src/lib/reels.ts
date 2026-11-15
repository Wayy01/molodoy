import "server-only";
import type { Media } from "@/db/schema";
import type { Reel } from "@/components/site/reels";
import { tiktokThumbnail } from "@/lib/tiktok";
import { t9n } from "@/lib/utils";

export async function toReels(items: Media[], locale: string, barberNames: Map<number, string>): Promise<Reel[]> {
  return Promise.all(
    items
      .filter((m): m is Media & { kind: "video" | "tiktok" } => m.kind === "video" || m.kind === "tiktok")
      .map(async (m) => ({
        id: m.id,
        kind: m.kind,
        src: m.src,
        poster: m.kind === "tiktok" ? (m.poster ?? (await tiktokThumbnail(m.src))) : m.poster,
        caption: t9n(m.caption, locale),
        barber: m.barberId ? (barberNames.get(m.barberId) ?? null) : null,
      })),
  );
}
