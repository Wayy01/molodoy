import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/motion/reveal";
import { t9n } from "@/lib/utils";
import type { Post } from "@/db/schema";

export async function BlogTeaser({ posts }: { posts: Post[] }) {
  const locale = await getLocale();
  const format = await getFormatter();
  const t = await getTranslations("site.blog");
  const [lead, ...rest] = posts;
  if (!lead) return null;

  return (
    <Reveal className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16">
      <Link href={`/blog/${lead.slug}`} className="group block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2">
          {lead.cover && (
            <Image src={lead.cover} alt="" fill sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]" />
          )}
        </div>
        <p className="mt-5 text-sm text-subtle">{lead.publishedAt && format.dateTime(lead.publishedAt, { day: "numeric", month: "long" })}</p>
        <h3 className="mt-2 font-display text-2xl leading-tight font-semibold tracking-tight transition-colors group-hover:text-accent sm:text-3xl">
          {t9n(lead.title, locale)}
        </h3>
        <p className="mt-3 max-w-[60ch] text-muted">{t9n(lead.excerpt, locale)}</p>
      </Link>
      <div className="flex flex-col">
        {rest.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="group grid grid-cols-[1fr_auto] items-start gap-5 border-t border-line py-7 first:border-t-0 first:pt-0 lg:first:border-t lg:first:pt-7">
            <div>
              <p className="text-sm text-subtle">{p.publishedAt && format.dateTime(p.publishedAt, { day: "numeric", month: "long" })}</p>
              <h3 className="mt-2 text-xl leading-snug font-semibold transition-colors group-hover:text-accent">{t9n(p.title, locale)}</h3>
              <p className="mt-2 line-clamp-2 text-muted">{t9n(p.excerpt, locale)}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium">
                {t("readMore")} <ArrowUpRight size={14} />
              </span>
            </div>
            {p.cover && (
              <div className="relative aspect-square w-24 overflow-hidden rounded-xl bg-surface-2 sm:w-28">
                <Image src={p.cover} alt="" fill sizes="112px" className="object-cover" />
              </div>
            )}
          </Link>
        ))}
      </div>
    </Reveal>
  );
}
