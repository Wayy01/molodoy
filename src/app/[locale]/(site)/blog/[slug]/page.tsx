import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Reveal } from "@/components/motion/reveal";
import { getPostBySlug, getPublishedPosts } from "@/lib/data";
import { t9n } from "@/lib/utils";
import { readingMinutes } from "../reading";

export const revalidate = 600;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/blog/[slug]">): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  return {
    title: t9n(post.title, locale),
    description: t9n(post.excerpt, locale),
    openGraph: { type: "article", images: post.cover ? [post.cover] : undefined, publishedTime: post.publishedAt?.toISOString() },
  };
}

export default async function PostPage({ params }: PageProps<"/[locale]/blog/[slug]">) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const post = await getPostBySlug(slug);
  if (!post) notFound();
  const [t, tn, format] = await Promise.all([getTranslations("site.blog"), getTranslations("common.nav"), getFormatter()]);
  const body = t9n(post.body, locale);

  return (
    <article className="pt-28 pb-24 sm:pt-36">
      <div className="container-x max-w-3xl">
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-muted hover:text-fg">
          <ArrowLeft size={16} /> {t("back")}
        </Link>
        <Reveal className="mt-8">
          <p data-reveal className="tabular text-sm text-subtle">
            {post.publishedAt && format.dateTime(post.publishedAt, { day: "numeric", month: "long", year: "numeric" })}
            {"  /  "}
            {t("minRead", { count: readingMinutes(body) })}
          </p>
          <h1 data-reveal className="display mt-4 text-[clamp(2.25rem,6vw,4rem)] leading-[1.03]">
            {t9n(post.title, locale)}
          </h1>
          <p data-reveal className="mt-6 text-xl leading-relaxed text-muted">
            {t9n(post.excerpt, locale)}
          </p>
        </Reveal>
      </div>
      {post.cover && (
        <div className="container-x mt-12 max-w-5xl">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-surface-2">
            <Image src={post.cover} alt="" fill priority sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      <div className="container-x mt-12 max-w-3xl">
        <div className="prose-molodoy">
          <Markdown>{body}</Markdown>
        </div>
        <div className="mt-16 flex flex-col items-start gap-5 rounded-2xl border border-line bg-surface p-7 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <p className="font-display text-xl font-semibold">{t("ctaTitle")}</p>
          <Link href="/book" className={buttonVariants({ size: "lg" })}>
            {tn("book")} <ArrowRight size={18} weight="bold" />
          </Link>
        </div>
      </div>
    </article>
  );
}
