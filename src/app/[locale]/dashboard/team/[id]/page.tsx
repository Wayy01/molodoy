import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { LevelBadge } from "@/components/ui/badge";
import { BarberForm } from "@/components/dashboard/admin/team/barber-form";
import { StaffLoginCard } from "@/components/dashboard/admin/team/staff-login-card";
import { TimeOffCard } from "@/components/dashboard/admin/team/time-off-card";
import { getBarberEditor } from "@/lib/dashboard/admin/team";
import { getDashboardContext } from "@/lib/dashboard/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("team") };
}

export default async function BarberPage({ params }: PageProps<"/[locale]/dashboard/team/[id]">) {
  const { id } = await params;
  const barberId = Number(id);
  if (!Number.isInteger(barberId) || barberId <= 0) notFound();

  const ctx = await getDashboardContext(["owner", "manager"]);
  const [editor, tNav] = await Promise.all([getBarberEditor(ctx, barberId), getTranslations("dashboard.nav")]);
  if (!editor) notFound();
  const { barber, login, absences } = editor;

  return (
    <>
      <Link href="/dashboard/team" className="mb-2 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {tNav("team")}
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {barber.name}
            <LevelBadge level={barber.level} />
          </span>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <BarberForm barber={barber} locations={ctx.locations} canPickLocation={ctx.user.role === "owner"} />
        <div className="flex flex-col gap-6 lg:sticky lg:top-24">
          <StaffLoginCard barberId={barber.id} login={login} />
          <TimeOffCard absences={absences} />
        </div>
      </div>
    </>
  );
}
