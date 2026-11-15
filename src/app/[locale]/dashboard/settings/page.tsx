import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { DemoDataCard } from "@/components/dashboard/admin/settings/demo-data-card";
import { SettingsForm } from "@/components/dashboard/admin/settings/settings-form";
import { StaffAccounts } from "@/components/dashboard/admin/settings/staff-accounts";
import { demoCounts, listStaff } from "@/lib/dashboard/admin/staff";
import { getDashboardContext } from "@/lib/dashboard/context";
import { getSettings } from "@/lib/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const ctx = await getDashboardContext(["owner"]);
  const [settings, staff, counts, tNav] = await Promise.all([getSettings(), listStaff(), demoCounts(), getTranslations("dashboard.nav")]);

  return (
    <>
      <PageHeader title={tNav("settings")} />
      <div className="flex max-w-4xl flex-col gap-6">
        <SettingsForm settings={settings} />
        <StaffAccounts staff={staff} locations={ctx.locations} currentUserId={ctx.user.id} />
        <DemoDataCard counts={counts} />
      </div>
    </>
  );
}
