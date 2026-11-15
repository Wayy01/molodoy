import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations("site.notFound");
  return (
    <main className="theme-dark grain flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg px-6 text-center">
      <Image src="/logo.webp" alt="Molodoy" width={72} height={72} className="rounded-2xl" />
      <p className="display text-[clamp(5rem,18vw,11rem)] leading-none text-fg/10">404</p>
      <h1 className="display -mt-4 text-3xl sm:text-4xl">{t("title")}</h1>
      <p className="max-w-sm text-muted">{t("text")}</p>
      <Link href="/" className={buttonVariants({ size: "lg" })}>
        {t("home")}
      </Link>
    </main>
  );
}
