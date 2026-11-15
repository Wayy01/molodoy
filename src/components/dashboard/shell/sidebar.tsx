"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, SignOut } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { logout } from "@/app/[locale]/login/actions";
import type { Role } from "@/db/schema";
import { NAV_ITEMS, isActive } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitch } from "./locale-switch";
import type { DashboardTheme } from "@/lib/dashboard/context";

export function Sidebar({ role, name, photo, theme }: { role: Role; name: string; photo: string | null; theme: DashboardTheme }) {
  const t = useTranslations("dashboard");
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface lg:flex">
      <Link href="/dashboard" className="flex items-center gap-3 px-5 pt-6 pb-8">
        <Image src="/logo.webp" alt="" width={36} height={36} className="rounded-xl" />
        <span className="font-display text-[15px] font-semibold tracking-tight">Molodoy</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {NAV_ITEMS.filter((i) => i.roles.includes(role)).map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] transition-colors",
                active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
              )}
            >
              <item.icon size={19} weight={active ? "fill" : "regular"} className={active ? "text-accent" : ""} />
              {t(`nav.${item.key}`)}
            </Link>
          );
        })}
        <Link href="/" target="_blank" className="mt-4 flex h-10 items-center gap-3 rounded-xl px-3 text-[0.9375rem] text-muted hover:bg-surface-2 hover:text-fg">
          <ArrowSquareOut size={19} />
          {t("nav.viewSite")}
        </Link>
      </nav>

      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle theme={theme} />
          <LocaleSwitch />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
          <Avatar src={photo} name={name} size={34} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="text-xs text-muted">{t(`roles.${role}`)}</p>
          </div>
          <form action={logout}>
            <button type="submit" className="rounded-lg p-2 text-muted hover:bg-surface-3 hover:text-fg" aria-label="Logout">
              <SignOut size={18} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
