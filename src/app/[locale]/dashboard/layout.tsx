import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Sidebar } from "@/components/dashboard/shell/sidebar";
import { MobileNav } from "@/components/dashboard/shell/mobile-nav";
import { LocationSwitcher } from "@/components/dashboard/shell/location-switcher";
import { Avatar } from "@/components/ui/avatar";
import { getDashboardContext, THEME_COOKIE, type DashboardTheme } from "@/lib/dashboard/context";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false } };

// Every dashboard page is per user (session cookie). Without this, the locale layout's on-demand
// static rendering would try to cache these pages and fail when they read cookies.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children, params }: LayoutProps<"/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const ctx = await getDashboardContext();
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme: DashboardTheme = stored === "light" || stored === "dark" ? stored : "system";
  const photo = ctx.barber?.photo ?? null;

  return (
    <div className={`theme-${theme} dash-shell min-h-dvh bg-bg text-fg`}>
      <Sidebar role={ctx.user.role} name={ctx.user.name} photo={photo} theme={theme} />
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:h-16 lg:px-8">
            <Link href="/dashboard" className="flex items-center gap-2 lg:hidden">
              <Image src="/logo.webp" alt="Molodoy" width={30} height={30} className="rounded-lg" />
            </Link>
            <LocationSwitcher
              locations={ctx.locations.map((l) => ({ id: l.id, name: l.name }))}
              value={ctx.locationId}
              canChooseAll={ctx.user.role === "owner"}
            />
            <div className="ml-auto lg:hidden">
              <Avatar src={photo} name={ctx.user.name} size={32} />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">{children}</main>
      </div>
      <MobileNav role={ctx.user.role} theme={theme} />
    </div>
  );
}
