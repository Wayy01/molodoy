import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight, InstagramLogo, MapPin } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LevelBadge } from "@/components/ui/badge";
import { Reveal } from "@/components/motion/reveal";
import { ClipReveal } from "@/components/motion/clip-reveal";
import { getBarberBySlug, getMedia, getServices } from "@/lib/data";
import { formatMDL, priceFor, t9n } from "@/lib/utils";
import { NextSlots } from "./next-slots";

export const revalidate = 600;

// Rendered on first visit and cached; see the locale layout for why nothing is built ahead.
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps<"/[locale]/team/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) return {};
  return {
    title: `${barber.name}, ${t9n(barber.location.name, locale)}`,
    description: t9n(barber.bio, locale),
    openGraph: barber.photo ? { images: [barber.photo] } : undefined,
  };
}

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default async function BarberPage({ params }: PageProps<"/[locale]/team/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const barber = await getBarberBySlug(slug);
  if (!barber) notFound();

  const [t, tc, services, photos] = await Promise.all([
    getTranslations("site.barberPage"),
    getTranslations("common"),
    getServices(),
    getMedia({ kinds: ["photo"], barberId: barber.id, limit: 6 }),
  ]);
  const offered = services.filter((s) => priceFor(s, barber.level) != null);
  const work = photos.filter((p) => p.src !== barber.photo);
  const firstService = offered.find((s) => s.category === "hair") ?? offered[0];

  return (
    <div className="container-x pt-28 pb-24 sm:pt-32">
      <Link href="/team" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} /> {t("back")}
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
        <ClipReveal className="relative aspect-[4/5] rounded-2xl bg-surface-2 lg:sticky lg:top-28 lg:self-start">
          <div className="absolute inset-0">
            {barber.photo ? (
              <Image src={barber.photo} alt={barber.name} fill priority sizes="(min-width: 1024px) 42vw, 100vw" className="object-cover object-[center_30%]" />
            ) : (
              <span className="display flex h-full items-center justify-center text-[10rem] text-fg/10">{barber.name[0]}</span>
            )}
          </div>
        </ClipReveal>

        <div>
          <Reveal>
            <div data-reveal className="flex items-center gap-3">
              <LevelBadge level={barber.level} />
              <span className="flex items-center gap-1.5 text-sm text-muted">
                <MapPin size={15} /> {t("worksAt", { location: t9n(barber.location.name, locale) })}
              </span>
            </div>
            <h1 data-reveal className="display mt-5 text-[clamp(3rem,9vw,7rem)] leading-[0.95]">
              {barber.name}
            </h1>
            {barber.bio && (
              <p data-reveal className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
                {t9n(barber.bio, locale)}
              </p>
            )}
            <div data-reveal className="mt-8 flex flex-wrap gap-3">
              <Link href={`/book?barber=${barber.slug}`} className={buttonVariants({ size: "lg" })}>
                {t("bookWith", { name: barber.name })} <ArrowRight size={18} weight="bold" />
              </Link>
              {barber.instagram && (
                <a href={barber.instagram} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "secondary" })}>
                  <InstagramLogo size={20} /> Instagram
                </a>
              )}
            </div>
          </Reveal>

          {firstService && (
            <section className="mt-14">
              <h2 className="mb-4 font-display text-lg font-semibold">{t("nextFree")}</h2>
              <NextSlots barberId={barber.id} barberSlug={barber.slug} serviceId={firstService.id} serviceSlug={firstService.slug} />
            </section>
          )}

          <section className="mt-14">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("services")}</h2>
            <ul className="overflow-hidden rounded-2xl border border-line">
              {offered.map((s, i) => (
                <li key={s.id} className={`flex items-center justify-between gap-4 px-5 py-4 ${i % 2 ? "bg-surface/60" : ""}`}>
                  <div>
                    <p className="font-medium">{t9n(s.name, locale)}</p>
                    <p className="tabular text-sm text-muted">{tc("time.min", { count: s.durationMin })}</p>
                  </div>
                  <Link href={`/book?barber=${barber.slug}&service=${s.slug}`} className="tabular shrink-0 font-display text-lg font-medium hover:text-accent">
                    {formatMDL(priceFor(s, barber.level)!, locale)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="mb-4 font-display text-lg font-semibold">{t("schedule")}</h2>
            <div className="grid grid-cols-7 gap-1.5">
              {WEEK.map((d) => {
                const h = barber.workingHours[d];
                return (
                  <div key={d} className={`rounded-xl border px-1 py-3 text-center ${h ? "border-line bg-surface" : "border-dashed border-line"}`}>
                    <p className="text-xs text-muted">{tc(`weekdays.short.${d}`)}</p>
                    <p className={`tabular mt-1 text-[11px] leading-tight sm:text-xs ${h ? "text-fg" : "text-subtle"}`}>
                      {h ? (
                        <>
                          {h.start}
                          <br />
                          {h.end}
                        </>
                      ) : (
                        t("dayOff")
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {work.length > 0 && (
            <section className="mt-14">
              <h2 className="mb-4 font-display text-lg font-semibold">{t("work")}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {work.map((p) => (
                  <div key={p.id} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-2">
                    <Image src={p.src} alt={t9n(p.caption, locale)} fill sizes="(min-width: 640px) 20vw, 50vw" className="object-cover" />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
