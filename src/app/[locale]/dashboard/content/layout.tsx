import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { ContentTabs } from "@/components/dashboard/admin/content/content-tabs";
import { getDashboardContext } from "@/lib/dashboard/context";

export default async function ContentLayout({ children }: LayoutProps<"/[locale]/dashboard/content">) {
  await getDashboardContext(["owner", "manager"]);
  const [t, tNav] = await Promise.all([getTranslations("dashAdmin.content"), getTranslations("dashboard.nav")]);
  return (
    <>
      <PageHeader title={tNav("content")} description={t("description")} />
      <ContentTabs />
      {children}
    </>
  );
}
