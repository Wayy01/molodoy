import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PhotoGallery } from "@/components/site/photo-gallery";
import { Reels } from "@/components/site/reels";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";
import { getBarbers, getMedia } from "@/lib/data";
import { toReels } from "@/lib/reels";
import { t9n } from "@/lib/utils";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/work">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.workPage" });
  return { title: t("title"), description: t("sub") };
}

export default async function WorkPage({ params }: PageProps<"/[locale]/work">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, photos, videos, barbers] = await Promise.all([
    getTranslations("site.workPage"),
    getMedia({ kinds: ["photo"] }),
    getMedia({ kinds: ["video", "tiktok"] }),
    getBarbers(),
  ]);
  const names = new Map(barbers.map((b) => [b.id, b.name]));
  const reels = await toReels(videos, locale, names);

  return (
    <div className="container-x pt-32 pb-24 sm:pt-40">
      <Reveal>
        <h1 data-reveal className="display text-[clamp(2.5rem,8vw,6rem)] leading-[0.98]">
          {t("title")}
        </h1>
        <p data-reveal className="mt-5 max-w-xl text-lg text-muted">
          {t("sub")}
        </p>
        <nav data-reveal className="mt-10 flex gap-2">
          <a href="#foto" className="h-10 rounded-full border border-fg bg-fg px-5 text-sm leading-10 font-medium text-bg">
            {t("photos")} <span className="tabular opacity-60">{photos.length}</span>
          </a>
          <a href="#video" className="h-10 rounded-full border border-line-strong px-5 text-sm leading-10 font-medium text-muted hover:border-fg hover:text-fg">
            {t("videos")} <span className="tabular opacity-60">{reels.length}</span>
          </a>
        </nav>
      </Reveal>

      <section id="foto" className="mt-14 scroll-mt-28">
        {photos.length ? (
          <PhotoGallery
            photos={photos.map((p) => ({
              id: p.id,
              src: p.src,
              caption: t9n(p.caption, locale),
              by: p.barberId ? t("by", { name: names.get(p.barberId) ?? "" }) : null,
              width: p.width,
              height: p.height,
            }))}
          />
        ) : (
          <EmptyState title={t("empty")} />
        )}
      </section>

      <section id="video" className="mt-24 scroll-mt-28">
        <h2 className="display mb-8 text-3xl sm:text-5xl">{t("videos")}</h2>
        {reels.length ? <Reels reels={reels} layout="grid" /> : <EmptyState title={t("empty")} />}
      </section>
    </div>
  );
}
