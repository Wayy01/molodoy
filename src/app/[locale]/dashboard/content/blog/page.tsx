import type { Metadata } from "next";
import Image from "next/image";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { Article, CaretRight, Plus } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { listPosts } from "@/lib/dashboard/admin/content";
import { getDashboardContext } from "@/lib/dashboard/context";
import { t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("content") };
}

export default async function BlogListPage() {
  await getDashboardContext(["owner", "manager"]);
  const [posts, t, format, locale] = await Promise.all([listPosts(), getTranslations("dashAdmin.blog"), getFormatter(), getLocale()]);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{t("summary", { count: posts.length })}</p>
        <Link href="/dashboard/content/blog/new" className={buttonVariants({ className: "w-full sm:w-auto" })}>
          <Plus size={18} />
          {t("new")}
        </Link>
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={<Article />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="flex flex-col gap-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/dashboard/content/blog/${p.id}`}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong active:bg-surface-2 sm:p-4"
              >
                <div className="relative aspect-[4/3] w-20 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:w-28">
                  {p.cover ? <Image src={p.cover} alt="" fill sizes="112px" className="object-cover" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 font-medium sm:line-clamp-1">{t9n(p.title, locale) || t("untitled")}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted">
                    {p.scheduled ? (
                      <Badge tone="info">{t("status.scheduled")}</Badge>
                    ) : p.status === "published" ? (
                      <Badge tone="success">{t("status.published")}</Badge>
                    ) : (
                      <Badge>{t("status.draft")}</Badge>
                    )}
                    <span className="tabular">
                      {p.publishedAt ? format.dateTime(p.publishedAt, { day: "numeric", month: "short", year: "numeric" }) : t("notPublished")}
                    </span>
                  </div>
                </div>
                <CaretRight size={18} className="shrink-0 text-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
