import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";

export async function generateMetadata({ params }: PageProps<"/[locale]/login">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common.auth" });
  return { title: t("title"), robots: { index: false } };
}

export default async function LoginPage({ params }: PageProps<"/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("common.auth");

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <Image src="/media/barbers/grigori.webp" alt="" fill priority sizes="55vw" className="object-cover object-[center_35%] grayscale" />
        <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
        <p className="display absolute bottom-10 left-10 text-6xl text-fg">Molodoy</p>
      </div>
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="inline-flex items-center gap-2 self-start text-sm text-muted transition-colors hover:text-fg">
          <ArrowLeft size={16} />
          {t("back")}
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Image src="/logo.webp" alt="Molodoy Barbershop" width={64} height={64} className="mb-8 rounded-2xl" />
          <h1 className="display text-3xl">{t("title")}</h1>
          <p className="mt-3 mb-10 text-muted">{t("subtitle")}</p>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
