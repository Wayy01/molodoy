import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ServicesManager } from "@/components/dashboard/admin/services/services-manager";
import { listAllServices } from "@/lib/dashboard/admin/catalog";
import { getDashboardContext } from "@/lib/dashboard/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("services") };
}

export default async function ServicesPage() {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const [services, tNav] = await Promise.all([listAllServices(), getTranslations("dashboard.nav")]);
  return <ServicesManager services={services} canEdit={ctx.user.role === "owner"} title={tNav("services")} />;
}
