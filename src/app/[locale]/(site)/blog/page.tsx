import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";
import { EmptyState } from "@/components/ui/empty-state";
import { getPublishedPosts } from "@/lib/data";
import { t9n } from "@/lib/utils";
import { readingMinutes } from "./reading";

export const revalidate = 600;

export async function generateMetadata({ params }: PageProps<"/[locale]/blog">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.nav" });
  return { title: t("blog") };
}

export default async function BlogPage({ params }: PageProps<"/[locale]/blog">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, tn, posts, format] = await Promise.all([getTranslations("site.blog"), getTranslations("common.nav"), getPublishedPosts(), getFormatter()]);

  return (
    <div className="container-x pt-32 pb-24 sm:pt-40">
      <Reveal>
        <h1 data-reveal className="display text-[clamp(2.5rem,8vw,6rem)] leading-[0.98]">
          {tn("blog")}
        </h1>
      </Reveal>
      {posts.length === 0 ? (
        <EmptyState className="mt-14" title={t("empty")} />
      ) : (
        <Reveal className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
          {posts.map((p, i) => (
            <Link key={p.id} href={`/blog/${p.slug}`} className={`group block ${i === 0 ? "sm:col-span-2 lg:col-span-2" : ""}`}>
              <div className={`relative overflow-hidden rounded-2xl bg-surface-2 ${i === 0 ? "aspect-[16/9]" : "aspect-[4/3]"}`}>
                {p.cover && (
                  <Image
                    src={p.cover}
                    alt=""
                    fill
                    sizes={i === 0 ? "(min-width: 1024px) 66vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
                  />
                )}
              </div>
              <p className="tabular mt-5 text-sm text-subtle">
                {p.publishedAt && format.dateTime(p.publishedAt, { day: "numeric", month: "long", year: "numeric" })}
                {"  /  "}
                {t("minRead", { count: readingMinutes(t9n(p.body, locale)) })}
              </p>
              <h2 className={`mt-2 font-display leading-tight font-semibold tracking-tight transition-colors group-hover:text-accent ${i === 0 ? "text-3xl sm:text-4xl" : "text-2xl"}`}>
                {t9n(p.title, locale)}
              </h2>
              <p className="mt-3 line-clamp-3 max-w-[60ch] text-muted">{t9n(p.excerpt, locale)}</p>
            </Link>
          ))}
        </Reveal>
      )}
    </div>
  );
}
