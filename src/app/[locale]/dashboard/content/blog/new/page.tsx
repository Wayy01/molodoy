import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PostForm } from "@/components/dashboard/admin/content/post-form";
import { getDashboardContext } from "@/lib/dashboard/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashAdmin.postForm");
  return { title: t("newTitle") };
}

export default async function NewPostPage() {
  await getDashboardContext(["owner", "manager"]);
  const t = await getTranslations("dashAdmin.postForm");
  const empty = { ro: "", ru: "" };

  return (
    <>
      <Link href="/dashboard/content/blog" className="mb-2 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {t("back")}
      </Link>
      <h2 className="mb-5 font-display text-xl font-semibold tracking-tight">{t("newTitle")}</h2>
      <PostForm post={{ id: null, slug: "", title: empty, excerpt: empty, body: empty, cover: null, status: "draft", publishedAt: "" }} />
    </>
  );
}
