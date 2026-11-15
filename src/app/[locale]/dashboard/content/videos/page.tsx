import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VideosManager } from "@/components/dashboard/admin/content/videos-manager";
import { listMedia, VIDEO_KINDS } from "@/lib/dashboard/admin/content";
import { getDashboardContext } from "@/lib/dashboard/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("content") };
}

export default async function VideosPage() {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const { items, barbers } = await listMedia(ctx, VIDEO_KINDS);
  return <VideosManager items={items} barbers={barbers} />;
}
