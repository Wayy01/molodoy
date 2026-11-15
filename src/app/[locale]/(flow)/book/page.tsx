import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookingWizard } from "@/components/booking/wizard";
import { Skeleton } from "@/components/ui/skeleton";
import { getBarbers, getLocations, getServices, getSettings } from "@/lib/data";

export const revalidate = 300;

export async function generateMetadata({ params }: PageProps<"/[locale]/book">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("meta") };
}

export default async function BookPage({ params }: PageProps<"/[locale]/book">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [locations, barbers, services, settings] = await Promise.all([getLocations(), getBarbers(), getServices(), getSettings()]);

  return (
    <Suspense
      fallback={
        <div className="container-x pt-28">
          <Skeleton className="h-1 w-full" />
          <Skeleton className="mt-10 h-12 w-72" />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      }
    >
      <BookingWizard
        locations={locations.map((l) => ({
          id: l.id,
          slug: l.slug,
          name: l.name,
          address: l.address,
          photo: l.photo,
          barbers: barbers.filter((b) => b.locationId === l.id).length,
        }))}
        barbers={barbers.map((b) => ({ id: b.id, slug: b.slug, name: b.name, photo: b.photo, level: b.level, locationId: b.locationId }))}
        services={services.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          category: s.category,
          durationMin: s.durationMin,
          prices: { barber: s.priceBarber, pro: s.pricePro, top: s.priceTop },
        }))}
        discount={settings.firstVisitDiscount}
      />
    </Suspense>
  );
}
