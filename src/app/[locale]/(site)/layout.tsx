import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { MobileBookBar } from "@/components/site/mobile-book-bar";
import { getLocations, getSettings } from "@/lib/data";

export default async function SiteLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [locations, settings] = await Promise.all([getLocations(), getSettings()]);

  return (
    <div className="theme-dark grain flex min-h-dvh flex-col bg-bg">
      <Header phone={settings.phone} />
      <main className="flex-1">{children}</main>
      <Footer locations={locations} settings={settings} />
      <MobileBookBar />
    </div>
  );
}
