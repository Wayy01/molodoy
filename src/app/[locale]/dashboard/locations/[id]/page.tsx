import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { LocationForm } from "@/components/dashboard/admin/locations/location-form";
import { getLocation } from "@/lib/dashboard/admin/catalog";
import { getDashboardContext } from "@/lib/dashboard/context";
import { t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("locations") };
}

export default async function LocationPage({ params }: PageProps<"/[locale]/dashboard/locations/[id]">) {
  const { id } = await params;
  const locationId = Number(id);
  if (!Number.isInteger(locationId) || locationId <= 0) notFound();

  await getDashboardContext(["owner"]);
  const [location, tNav, locale] = await Promise.all([getLocation(locationId), getTranslations("dashboard.nav"), getLocale()]);
  if (!location) notFound();

  return (
    <>
      <Link href="/dashboard/locations" className="mb-2 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {tNav("locations")}
      </Link>
      <PageHeader title={t9n(location.name, locale)} />
      <LocationForm location={location} />
    </>
  );
}
