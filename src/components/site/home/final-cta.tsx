import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Phone, Scissors } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { ClipReveal } from "@/components/motion/clip-reveal";
import { Reveal } from "@/components/motion/reveal";
import { formatPhone } from "@/lib/utils";

/**
 * Closing card. The photo is masked into the card surface (below the text on phones, beside it on desktop)
 * so the section reads as one composition: offer, headline, one primary action, phone as the quiet fallback.
 */
export async function FinalCta({ phone, discount }: { phone: string; discount: number }) {
  const t = await getTranslations("site.cta");
  const tNav = await getTranslations("common.nav");

  return (
    <section className="container-x pb-24 sm:pb-32">
      <div className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-surface">
        <ClipReveal className="relative aspect-[4/5] w-full [mask-image:linear-gradient(to_bottom,black_35%,transparent_92%)] sm:aspect-[16/11] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-[56%] lg:[mask-image:linear-gradient(to_right,transparent,black_45%)]">
          <Image
            src="/media/barbers/danik.webp"
            alt=""
            fill
            sizes="(min-width: 1024px) 56vw, 100vw"
            className="object-cover object-[center_25%]"
          />
        </ClipReveal>

        <Reveal className="relative -mt-32 flex flex-col px-6 pb-8 sm:-mt-44 sm:px-12 sm:pb-12 lg:mt-0 lg:min-h-[560px] lg:max-w-[54%] lg:justify-center lg:p-16">
          {discount > 0 && (
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-sm font-medium text-accent backdrop-blur-md">
              <Scissors size={16} weight="bold" />
              {t("offer", { amount: discount })}
            </span>
          )}
          <h2 className="display text-[clamp(2.5rem,10.5vw,4rem)] leading-[0.98] text-balance lg:text-[clamp(3rem,5.2vw,5rem)]">{t("title")}</h2>
          <p className="mt-4 max-w-md text-base text-pretty text-muted sm:text-lg">{t("sub")}</p>
          <div data-book-cta className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
            <Link href="/book" className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}>
              {tNav("book")} <ArrowRight size={18} weight="bold" />
            </Link>
            <a href={`tel:${phone}`} className="group inline-flex items-center gap-3 self-start">
              <span className="flex size-11 items-center justify-center rounded-full border border-line-strong transition-colors group-hover:border-fg">
                <Phone size={18} />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs text-subtle">{t("orCall")}</span>
                <span className="tabular mt-0.5 font-medium">{formatPhone(phone)}</span>
              </span>
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
