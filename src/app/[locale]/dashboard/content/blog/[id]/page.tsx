import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PostForm } from "@/components/dashboard/admin/content/post-form";
import { getPost } from "@/lib/dashboard/admin/content";
import { getDashboardContext } from "@/lib/dashboard/context";
import { dateKey, timeKey } from "@/lib/time";
import { t9n } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("content") };
}

export default async function EditPostPage({ params }: PageProps<"/[locale]/dashboard/content/blog/[id]">) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId) || postId <= 0) notFound();

  await getDashboardContext(["owner", "manager"]);
  const [post, t, locale] = await Promise.all([getPost(postId), getTranslations("dashAdmin.postForm"), getLocale()]);
  if (!post) notFound();

  return (
    <>
      <Link href="/dashboard/content/blog" className="mb-2 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <h2 className="mb-5 line-clamp-2 font-display text-xl font-semibold tracking-tight">{t9n(post.title, locale) || t("editTitle")}</h2>
      <PostForm
        post={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          cover: post.cover,
          status: post.status,
          publishedAt: post.publishedAt ? `${dateKey(post.publishedAt)}T${timeKey(post.publishedAt)}` : "",
        }}
      />
    </>
  );
}
