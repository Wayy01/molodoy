import { setRequestLocale } from "next-intl/server";
import { Header } from "@/components/site/header";
import { getSettings } from "@/lib/data";

/** Booking screens: same header, no footer or floating CTA, so nothing competes with finishing the booking. */
export default async function FlowLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const settings = await getSettings();
  return (
    <div className="theme-dark grain min-h-dvh bg-bg">
      <Header phone={settings.phone} />
      <main>{children}</main>
    </div>
  );
}
