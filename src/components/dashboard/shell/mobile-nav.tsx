"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, DotsThreeOutline, SignOut } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { logout } from "@/app/[locale]/login/actions";
import type { Role } from "@/db/schema";
import type { DashboardTheme } from "@/lib/dashboard/context";
import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitch } from "./locale-switch";

/** Phone bottom tab bar: the four daily screens plus a "More" sheet for admin pages. */
export function MobileNav({ role, theme }: { role: Role; theme: DashboardTheme }) {
  const t = useTranslations("dashboard");
  const tAuth = useTranslations("common.auth");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV_ITEMS.filter((i) => i.roles.includes(role));
  const primary = items.filter((i) => i.primary);
  const rest = items.filter((i) => !i.primary);
  const moreActive = rest.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", active ? "text-fg" : "text-muted")}
              >
                <item.icon size={22} weight={active ? "fill" : "regular"} className={active ? "text-accent" : ""} />
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px]", moreActive ? "text-fg" : "text-muted")}
          >
            <DotsThreeOutline size={22} weight={moreActive ? "fill" : "regular"} className={moreActive ? "text-accent" : ""} />
            {t("nav.more")}
          </button>
        </div>
      </nav>

      <Dialog open={open} onClose={() => setOpen(false)} title={t("nav.more")}>
        <div className="flex flex-col gap-1">
          {rest.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex h-12 items-center gap-3 rounded-xl px-3",
                isActive(pathname, item.href) ? "bg-accent-soft text-fg" : "text-fg hover:bg-surface-2",
              )}
            >
              <item.icon size={20} />
              {t(`nav.${item.key}`)}
            </Link>
          ))}
          <Link href="/" target="_blank" className="flex h-12 items-center gap-3 rounded-xl px-3 hover:bg-surface-2">
            <ArrowSquareOut size={20} />
            {t("nav.viewSite")}
          </Link>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-4">
            <ThemeToggle theme={theme} />
            <LocaleSwitch />
          </div>
          <form action={logout} className="mt-3">
            <button type="submit" className="flex h-12 w-full items-center gap-3 rounded-xl px-3 text-danger hover:bg-danger/10">
              <SignOut size={20} />
              {tAuth("logout")}
            </button>
          </form>
        </div>
      </Dialog>
    </>
  );
}
