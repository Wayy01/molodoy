import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Gift } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { PriceMatrix } from "@/components/site/price-matrix";
import { Reveal } from "@/components/motion/reveal";
import { getServices, getSettings } from "@/lib/data";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/prices">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.pricesPage" });
  return { title: t("title"), description: t("sub") };
}

export default async function PricesPage({ params }: PageProps<"/[locale]/prices">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tp, tl, services, settings] = await Promise.all([
    getTranslations("site.pricesPage"),
    getTranslations("site.prices"),
    getTranslations("common.levels"),
    getServices(),
    getSettings(),
  ]);

  const tiers = [
    { level: "barber", text: t("barberText") },
    { level: "pro", text: t("proText") },
    { level: "top", text: t("topText") },
  ] as const;

  return (
    <div className="container-x pt-32 pb-24 sm:pt-40">
      <Reveal>
        <h1 data-reveal className="display text-[clamp(2.5rem,8vw,6rem)] leading-[0.98]">
          {t("title")}
        </h1>
        <p data-reveal className="mt-5 max-w-xl text-lg text-muted">
          {t("sub")}
        </p>
        {settings.firstVisitDiscount > 0 && (
          <p data-reveal className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-accent/30 bg-accent-soft px-4 py-2 text-sm">
            <Gift size={18} className="text-accent" /> {tp("firstVisit", { amount: settings.firstVisitDiscount })}
          </p>
        )}
      </Reveal>

      <Reveal className="mt-14">
        <PriceMatrix
          showDescriptions
          rows={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
            prices: { barber: s.priceBarber, pro: s.pricePro, top: s.priceTop },
          }))}
        />
      </Reveal>

      <section className="mt-24">
        <Reveal>
          <h2 data-reveal className="display mb-8 text-3xl sm:text-4xl">
            {t("tiersTitle")}
          </h2>
        </Reveal>
        <Reveal className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {tiers.map((tier) => (
            <div key={tier.level} className="bg-surface p-6 sm:p-8">
              <p className={`font-display text-2xl font-semibold tracking-tight uppercase ${tier.level === "top" ? "text-accent" : ""}`}>{tl(tier.level)}</p>
              <p className="mt-3 text-muted">{tier.text}</p>
            </div>
          ))}
        </Reveal>
        <Link href="/book" className={buttonVariants({ size: "lg", className: "mt-10" })}>
          {t("book")} <ArrowRight size={18} weight="bold" />
        </Link>
      </section>
    </div>
  );
}
