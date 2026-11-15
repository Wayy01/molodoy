import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Clock, MapPin, Phone } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Reveal } from "@/components/motion/reveal";
import { getBarbers, getLocations } from "@/lib/data";
import { localizedMapEmbed } from "@/lib/maps";
import { formatPhone, t9n } from "@/lib/utils";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/locations">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.locationsPage" });
  return { title: t("title"), description: t("sub") };
}

export default async function LocationsPage({ params }: PageProps<"/[locale]/locations">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tl, tc, locations, barbers] = await Promise.all([
    getTranslations("site.locationsPage"),
    getTranslations("site.locations"),
    getTranslations("common.time"),
    getLocations(),
    getBarbers(),
  ]);

  return (
    <div className="container-x pt-32 pb-24 sm:pt-40">
      <Reveal>
        <h1 data-reveal className="display text-[clamp(2.5rem,8vw,6rem)] leading-[0.98]">
          {t("title")}
        </h1>
        <p data-reveal className="mt-5 max-w-xl text-lg text-muted">
          {t("sub")}
        </p>
      </Reveal>

      <div className="mt-16 flex flex-col gap-20 sm:mt-24 sm:gap-28">
        {locations.map((l, i) => {
          const team = barbers.filter((b) => b.locationId === l.id);
          return (
            <section key={l.id} id={l.slug} className="grid scroll-mt-28 gap-8 lg:grid-cols-2 lg:gap-14">
              <Reveal className={i % 2 ? "lg:order-2" : ""}>
                <h2 data-reveal className="display text-[clamp(2.25rem,6vw,4.5rem)] leading-none">
                  {t9n(l.name, locale)}
                </h2>
                <dl data-reveal className="mt-8 flex flex-col gap-5">
                  <div className="flex gap-4">
                    <MapPin size={22} className="mt-0.5 shrink-0 text-accent" />
                    <div>
                      <dt className="text-sm text-muted">{t("address")}</dt>
                      <dd className="text-lg">{t9n(l.address, locale)}</dd>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Clock size={22} className="mt-0.5 shrink-0 text-accent" />
                    <div>
                      <dt className="text-sm text-muted">{t("hours")}</dt>
                      <dd className="tabular text-lg">{tc("daily", { hours: `${l.opensAt}-${l.closesAt}` })}</dd>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Phone size={22} className="mt-0.5 shrink-0 text-accent" />
                    <div>
                      <dt className="text-sm text-muted">{t("phone")}</dt>
                      <dd>
                        <a href={`tel:${l.phone}`} className="tabular text-lg hover:text-accent">
                          {formatPhone(l.phone)}
                        </a>
                      </dd>
                    </div>
                  </div>
                </dl>
                <div data-reveal className="mt-8">
                  <p className="mb-3 text-sm text-muted">{t("team")}</p>
                  <div className="flex flex-wrap gap-2">
                    {team.map((b) => (
                      <Link key={b.id} href={`/team/${b.slug}`} className="flex items-center gap-2 rounded-full border border-line py-1 pr-3.5 pl-1 text-sm transition-colors hover:border-fg">
                        <Avatar src={b.photo} name={b.name} size={30} />
                        {b.name}
                      </Link>
                    ))}
                  </div>
                </div>
                <div data-reveal className="mt-10 flex flex-wrap gap-3">
                  <Link href={`/book?location=${l.slug}`} className={buttonVariants({ size: "lg" })}>
                    {tl("bookHere")} <ArrowRight size={18} weight="bold" />
                  </Link>
                  {l.mapLink && (
                    <a href={l.mapLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                      {t("openMaps")}
                    </a>
                  )}
                </div>
              </Reveal>
              {l.mapEmbedUrl && (
                <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-line bg-surface-2 lg:min-h-[480px]">
                  <iframe
                    src={localizedMapEmbed(l.mapEmbedUrl, locale)}
                    title={t9n(l.name, locale)}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    // Dark to match the site, but invert + hue-rotate keeps real colours (red pin, blue buttons, green parks).
                    className="absolute inset-0 h-full w-full [filter:invert(0.9)_hue-rotate(180deg)_saturate(0.95)_contrast(0.95)]"
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
