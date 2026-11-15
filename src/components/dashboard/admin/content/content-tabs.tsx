"use client";

import { useTranslations } from "next-intl";
import { Article, FilmStrip, ImagesSquare } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard/content", key: "gallery", icon: ImagesSquare },
  { href: "/dashboard/content/videos", key: "videos", icon: FilmStrip },
  { href: "/dashboard/content/blog", key: "blog", icon: Article },
] as const;

export function ContentTabs() {
  const t = useTranslations("dashAdmin.content.tabs");
  const pathname = usePathname();
  return (
    <nav className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" aria-label={t("label")}>
      {TABS.map((tab) => {
        const active = tab.href === "/dashboard/content" ? pathname === tab.href : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
              active ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            <tab.icon size={18} weight={active ? "fill" : "regular"} />
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
