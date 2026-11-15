import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { BarberForm } from "@/components/dashboard/admin/team/barber-form";
import { getDashboardContext } from "@/lib/dashboard/context";
import type { WeeklyHours } from "@/db/schema";

const DEFAULT_HOURS: WeeklyHours = [null, ...Array.from({ length: 6 }, () => ({ start: "10:00", end: "20:00" }))];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashAdmin.barberForm");
  return { title: t("newTitle") };
}

export default async function NewBarberPage() {
  const ctx = await getDashboardContext(["owner", "manager"]);
  const [t, tNav] = await Promise.all([getTranslations("dashAdmin.barberForm"), getTranslations("dashboard.nav")]);

  return (
    <>
      <Link href="/dashboard/team" className="mb-2 inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} />
        {tNav("team")}
      </Link>
      <PageHeader title={t("newTitle")} description={t("newHint")} />
      <div className="max-w-3xl">
        <BarberForm
          barber={{
            id: null,
            name: "",
            slug: "",
            level: "barber",
            locationId: ctx.locationId ?? ctx.locations[0]?.id ?? 0,
            photo: null,
            bio: null,
            instagram: null,
            workingHours: DEFAULT_HOURS,
            sortOrder: 0,
            active: true,
          }}
          locations={ctx.locations}
          canPickLocation={ctx.user.role === "owner"}
        />
      </div>
    </>
  );
}
