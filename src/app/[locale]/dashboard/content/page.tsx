import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GalleryManager } from "@/components/dashboard/admin/content/gallery-manager";
import { GALLERY_KINDS, listMedia } from "@/lib/dashboard/admin/content";
import { getDashboardContext } from "@/lib/dashboard/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("content") };
}

export default async function GalleryPage() {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const { items, barbers } = await listMedia(ctx, GALLERY_KINDS);
  return <GalleryManager items={items} barbers={barbers} />;
}
