import type { Metadata } from "next";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { CaretRight, Clock, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { listAllLocations } from "@/lib/dashboard/admin/catalog";
import { getDashboardContext } from "@/lib/dashboard/context";
import { cn, formatPhone, t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("locations") };
}

export default async function LocationsPage() {
  await getDashboardContext(["owner"]);
  const [locations, t, tNav, tCommon, locale] = await Promise.all([
    listAllLocations(),
    getTranslations("dashAdmin.locations"),
    getTranslations("dashboard.nav"),
    getTranslations("dashboard.common"),
    getLocale(),
  ]);

  return (
    <>
      <PageHeader title={tNav("locations")} description={t("description")} />
      <ul className="grid gap-4 md:grid-cols-2">
        {locations.map((l) => (
          <li key={l.id}>
            <Link
              href={`/dashboard/locations/${l.id}`}
              className={cn(
                "flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong active:bg-surface-2",
                !l.active && "opacity-60",
              )}
            >
              <div className="relative aspect-[16/7] bg-surface-2">
                {l.photo ? <Image src={l.photo} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" /> : null}
                <div className="absolute top-3 left-3">
                  {l.active ? <Badge tone="success">{tCommon("active")}</Badge> : <Badge>{tCommon("inactive")}</Badge>}
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-semibold tracking-tight">{t9n(l.name, locale)}</p>
                  <div className="mt-2 flex flex-col gap-1 text-sm text-muted">
                    <span className="flex items-center gap-2">
                      <MapPin size={15} className="shrink-0" />
                      <span className="truncate">{t9n(l.address, locale)}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="tabular flex items-center gap-2">
                        <Clock size={15} />
                        {l.opensAt}-{l.closesAt}
                      </span>
                      <span className="tabular flex items-center gap-2">
                        <Phone size={15} />
                        {formatPhone(l.phone)}
                      </span>
                    </span>
                  </div>
                </div>
                <CaretRight size={18} className="shrink-0 text-subtle" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
