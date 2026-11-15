/**
 * Google Maps iframe sources we accept: the "Share > Embed a map" URL (`/maps/embed?pb=...`), or a
 * place/search URL with `output=embed` (`?cid=...` or `?q=...`), which centres on the place at street zoom.
 */
export function isMapEmbedUrl(src: string) {
  return (
    /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed\?/.test(src) ||
    /^https:\/\/(www\.|maps\.)?google\.[a-z.]+\/maps\?(.*&)?output=embed(&|$)/.test(src)
  );
}

/** `output=embed` maps follow the page language; "Embed a map" URLs carry a fixed one inside `pb`. */
export function localizedMapEmbed(src: string, locale: string) {
  const url = new URL(src);
  if (url.searchParams.get("output") === "embed") url.searchParams.set("hl", locale);
  return url.toString();
}
