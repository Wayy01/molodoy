import { getTranslations, setRequestLocale } from "next-intl/server";
import { Hero } from "@/components/site/home/hero";
import { LocationsIndex } from "@/components/site/home/locations-index";
import { TeamRail } from "@/components/site/home/team-rail";
import { WorkBento } from "@/components/site/home/work-bento";
import { BlogTeaser } from "@/components/site/home/blog-teaser";
import { FinalCta } from "@/components/site/home/final-cta";
import { PriceMatrix } from "@/components/site/price-matrix";
import { Reels } from "@/components/site/reels";
import { SectionTitle } from "@/components/site/section-title";
import { Reveal } from "@/components/motion/reveal";
import { ScrubWords } from "@/components/motion/scrub-words";
import { getBarbers, getLocations, getMedia, getPublishedPosts, getServices, getSettings } from "@/lib/data";
import { toReels } from "@/lib/reels";
import { t9n } from "@/lib/utils";

export const revalidate = 600;

const HOME_SERVICES = ["tunsoare", "tunsoare-barba", "barba", "tunsoare-barba-tonare"];

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, locations, barbers, services, videos, photos, posts, settings] = await Promise.all([
    getTranslations("site"),
    getLocations(),
    getBarbers(),
    getServices(),
    getMedia({ kinds: ["video", "tiktok"], featured: true, limit: 6 }),
    getMedia({ kinds: ["photo"], featured: true, limit: 5 }),
    getPublishedPosts(3),
    getSettings(),
  ]);

  const counts: Record<number, number> = {};
  for (const b of barbers) counts[b.locationId] = (counts[b.locationId] ?? 0) + 1;
  const barberNames = new Map(barbers.map((b) => [b.id, b.name]));
  const reels = await toReels(videos, locale, barberNames);
  const homeServices = HOME_SERVICES.map((slug) => services.find((s) => s.slug === slug)).filter((s) => !!s);

  const base = process.env.SITE_URL ?? "https://molodoybarbershop.md";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": locations.map((l) => ({
      "@type": "HairSalon",
      "@id": `${base}/locations#${l.slug}`,
      name: `Molodoy Barbershop ${t9n(l.name, locale)}`,
      image: `${base}${l.photo ?? "/logo.png"}`,
      telephone: l.phone,
      priceRange: "50-550 MDL",
      address: { "@type": "PostalAddress", streetAddress: t9n(l.address, "ro").replace(/, Chișinău$/, ""), addressLocality: "Chișinău", addressCountry: "MD" },
      openingHoursSpecification: { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], opens: l.opensAt, closes: l.closesAt },
      url: `${base}${locale === "ru" ? "/ru" : ""}/locations#${l.slug}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero />

      <LocationsIndex locations={locations} counts={counts} />

      <section className="py-24 sm:py-32">
        <Reveal className="container-x">
          <SectionTitle title={t("team.title")} sub={t("team.sub")} href="/team" linkLabel={t("team.seeAll")} className="mb-8 sm:mb-10" />
        </Reveal>
        <TeamRail
          barbers={barbers.map((b) => ({ id: b.id, slug: b.slug, name: b.name, photo: b.photo, level: b.level, locationId: b.locationId }))}
          locations={locations.map((l) => ({ id: l.id, name: l.name }))}
        />
      </section>

      <section className="container-x py-24 sm:py-36">
        <ScrubWords text={t("manifesto")} className="display max-w-[22ch] text-[clamp(2rem,5.6vw,5rem)] leading-[1.06] tracking-[-0.04em]" />
      </section>

      {reels.length > 0 && (
        <section className="py-24 sm:py-32">
          <Reveal className="container-x">
            <SectionTitle title={t("reels.title")} sub={t("reels.sub")} href="/work#video" linkLabel={t("reels.seeAll")} />
          </Reveal>
          <div className="lg:pb-12">
            <Reels reels={reels} />
          </div>
        </section>
      )}

      <section className="container-x py-24 sm:py-32">
        <Reveal>
          <SectionTitle
            title={t("prices.title")}
            sub={`${t("prices.sub")} ${t("prices.firstVisit", { amount: settings.firstVisitDiscount })}`}
            href="/prices"
            linkLabel={t("prices.seeAll")}
          />
        </Reveal>
        <Reveal>
          <PriceMatrix
            rows={homeServices.map((s) => ({
              id: s.id,
              name: s.name,
              description: s.description,
              durationMin: s.durationMin,
              prices: { barber: s.priceBarber, pro: s.pricePro, top: s.priceTop },
            }))}
          />
        </Reveal>
      </section>

      {photos.length >= 5 && (
        <section className="container-x py-24 sm:py-32">
          <Reveal>
            <SectionTitle title={t("gallery.title")} href="/work" linkLabel={t("gallery.seeAll")} />
          </Reveal>
          <WorkBento photos={photos.map((p) => ({ id: p.id, src: p.src, alt: t9n(p.caption, locale) }))} />
        </section>
      )}

      {posts.length > 0 && (
        <section className="container-x py-24 sm:py-32">
          <Reveal>
            <SectionTitle title={t("blog.title")} href="/blog" linkLabel={t("blog.seeAll")} />
          </Reveal>
          <BlogTeaser posts={posts} />
        </section>
      )}

      <FinalCta phone={settings.phone} discount={settings.firstVisitDiscount} />
    </>
  );
}
