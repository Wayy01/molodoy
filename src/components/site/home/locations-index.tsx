import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";
import { SectionTitle } from "@/components/site/section-title";
import { t9n } from "@/lib/utils";
import type { Location } from "@/db/schema";

export async function LocationsIndex({ locations, counts }: { locations: Location[]; counts: Record<number, number> }) {
  const t = await getTranslations("site.locations");
  const tc = await getTranslations("common.time");
  const locale = await getLocale();

  return (
    <section className="container-x py-24 sm:py-32">
      <Reveal>
        <SectionTitle title={t("title")} />
      </Reveal>
      <Reveal as="ul" className="border-t border-line" stagger={0.06}>
        {locations.map((l) => (
          <li key={l.id} className="border-b border-line">
            <Link
              href={`/locations#${l.slug}`}
              className="group relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 py-6 sm:py-8 md:grid-cols-[1.2fr_1fr_auto_auto] md:gap-x-10"
            >
              <span className="display text-[clamp(2rem,5vw,3.75rem)] leading-none transition-[color,translate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 group-hover:text-accent">
                {t9n(l.name, locale)}
              </span>
              <span className="col-start-1 row-start-2 text-muted md:col-start-2 md:row-start-1">
                {t9n(l.address, locale)}
                <span className="tabular mt-1 block text-sm text-subtle">{tc("daily", { hours: `${l.opensAt}-${l.closesAt}` })}</span>
              </span>
              <span className="relative hidden text-sm text-muted md:block">
                {t("barbers", { count: counts[l.id] ?? 0 })}
                {/* Anchored to the count so the preview sits in the gap after the address and never covers the row's text. */}
                {l.photo && (
                  <span className="pointer-events-none absolute top-1/2 right-full z-10 mr-8 hidden aspect-[4/5] w-40 -translate-y-1/2 scale-90 -rotate-3 overflow-hidden rounded-2xl opacity-0 shadow-card transition-[opacity,scale,rotate] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-100 group-hover:rotate-0 group-hover:opacity-100 xl:block">
                    <Image src={l.photo} alt="" fill sizes="160px" className="object-cover" />
                  </span>
                )}
              </span>
              <span className="col-start-2 row-span-2 row-start-1 flex h-12 w-12 items-center justify-center rounded-full border border-line-strong transition-colors duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-accent-fg md:col-start-4 md:row-span-1">
                <ArrowUpRight size={20} />
              </span>
            </Link>
          </li>
        ))}
      </Reveal>
    </section>
  );
}
