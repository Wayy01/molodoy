import type { Metadata } from "next";
import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { BarberCard } from "@/components/site/barber-card";
import { Reveal } from "@/components/motion/reveal";
import { getBarbers, getLocations } from "@/lib/data";
import { t9n } from "@/lib/utils";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/team">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.teamPage" });
  return { title: t("title") };
}

export default async function TeamPage({ params }: PageProps<"/[locale]/team">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, barbers, locations] = await Promise.all([getTranslations("site.teamPage"), getBarbers(), getLocations()]);
  const current = await getLocale();

  return (
    <div className="container-x pt-32 pb-24 sm:pt-40">
      <Reveal>
        <h1 data-reveal className="display text-[clamp(2.5rem,8vw,6rem)] leading-[0.98]">
          {t("title")}
        </h1>
        <p data-reveal className="mt-5 max-w-xl text-lg text-muted">
          {t("sub", { count: barbers.length })}
        </p>
        <nav data-reveal className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {locations.map((l) => (
            <a key={l.id} href={`#${l.slug}`} className="h-10 shrink-0 rounded-full border border-line-strong px-4 text-sm leading-10 font-medium text-muted transition-colors hover:border-fg hover:text-fg">
              {t9n(l.name, current)}
            </a>
          ))}
        </nav>
      </Reveal>

      {locations.map((l) => {
        const team = barbers.filter((b) => b.locationId === l.id);
        if (!team.length) return null;
        return (
          <section key={l.id} id={l.slug} className="mt-20 scroll-mt-28 sm:mt-28">
            <Reveal className="mb-8 flex items-baseline justify-between gap-4 border-b border-line pb-5">
              <h2 className="display text-3xl sm:text-5xl">{t9n(l.name, current)}</h2>
              <p className="text-right text-sm text-muted">{t9n(l.address, current)}</p>
            </Reveal>
            <Reveal className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" stagger={0.05}>
              {team.map((b) => (
                <BarberCard
                  key={b.id}
                  slug={b.slug}
                  name={b.name}
                  photo={b.photo}
                  level={b.level}
                  locationName={t9n(l.name, current)}
                  sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                />
              ))}
            </Reveal>
          </section>
        );
      })}
    </div>
  );
}
