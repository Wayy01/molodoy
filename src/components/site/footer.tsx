import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { FacebookLogo, InstagramLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { formatPhone, t9n } from "@/lib/utils";
import type { Location, SiteSettings } from "@/db/schema";
import { LocaleToggle } from "./locale-toggle";

export async function Footer({ locations, settings }: { locations: Location[]; settings: SiteSettings }) {
  const t = await getTranslations("common");
  const locale = await getLocale();
  const socials = [
    { href: settings.instagram, label: "Instagram", icon: InstagramLogo },
    { href: settings.tiktok, label: "TikTok", icon: TiktokLogo },
    { href: settings.facebook, label: "Facebook", icon: FacebookLogo },
  ].filter((s) => s.href);

  return (
    <footer className="relative overflow-hidden border-t border-line pt-16 pb-28 sm:pb-10">
      <div className="container-x">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2fr]">
          <div className="flex flex-col gap-5">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.webp" alt="" width={52} height={52} className="rounded-2xl" />
              <span className="font-display text-lg font-semibold">MOLODOY</span>
            </Link>
            <p className="max-w-xs text-muted">{t("footer.tagline")}</p>
            {socials.length > 0 && (
              <div className="flex gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-fg hover:text-fg"
                  >
                    <s.icon size={20} />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-10 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <p className="mb-4 text-sm font-medium text-subtle">{t("nav.locations")}</p>
              <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {locations.map((l) => (
                  <li key={l.id}>
                    <Link href={`/locations#${l.slug}`} className="group block">
                      <span className="font-medium transition-colors group-hover:text-accent">{t9n(l.name, locale)}</span>
                      <span className="block text-sm text-muted">{t9n(l.address, locale)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-2 text-sm font-medium text-subtle">{t("footer.contact")}</p>
                <a href={`tel:${settings.phone}`} className="tabular block font-medium hover:text-accent">
                  {formatPhone(settings.phone)}
                </a>
                {settings.email && (
                  <a href={`mailto:${settings.email}`} className="block text-muted hover:text-fg">
                    {settings.email}
                  </a>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-subtle">{t("footer.hours")}</p>
                <p className="tabular">{t("time.daily", { hours: "10:00-20:00" })}</p>
              </div>
            </div>
          </div>
        </div>

        <p aria-hidden className="display pointer-events-none mt-16 text-[19vw] leading-[0.8] text-fg/[0.06] select-none lg:text-[15vw]">
          MOLODOY
        </p>

        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-6 text-sm text-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-6">
            <LocaleToggle />
            <Link href="/login" className="hover:text-fg">
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
