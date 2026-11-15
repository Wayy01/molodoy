import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Onest, Unbounded } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { routing } from "@/i18n/routing";
import "../globals.css";

const onest = Onest({ subsets: ["latin", "latin-ext", "cyrillic"], variable: "--font-onest", display: "swap" });
const unbounded = Unbounded({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-unbounded",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.meta" });
  return {
    metadataBase: new URL(process.env.SITE_URL ?? "https://molodoybarbershop.md"),
    title: { default: t("title"), template: `%s | Molodoy Barbershop` },
    description: t("description"),
    icons: { icon: "/favicon.png", apple: "/logo.png" },
    openGraph: { siteName: "Molodoy Barbershop", type: "website", locale: locale === "ru" ? "ru_MD" : "ro_MD", images: ["/media/hero/hero.webp"] },
    alternates: { languages: { ro: "/", ru: "/ru" } },
  };
}

export const viewport: Viewport = {
  themeColor: "#121214",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${onest.variable} ${unbounded.variable}`}>
      <body className="min-h-dvh bg-bg text-fg antialiased">
        <NextIntlClientProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              className: "!bg-surface-2 !text-fg !border-line-strong !rounded-2xl !font-sans",
            }}
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
