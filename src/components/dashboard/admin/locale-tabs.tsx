"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export type Lang = "ro" | "ru";
export const LANGS: Lang[] = ["ro", "ru"];

/** RO / RU switch for localized fields. A dot marks the language that still has errors. */
export function LocaleTabs({
  value,
  onChange,
  errors,
  className,
}: {
  value: Lang;
  onChange: (lang: Lang) => void;
  errors?: Partial<Record<Lang, boolean>>;
  className?: string;
}) {
  const t = useTranslations("dashboard.common");
  return (
    <div role="tablist" className={cn("inline-flex rounded-full border border-line bg-surface-2 p-1", className)}>
      {LANGS.map((lang) => (
        <button
          key={lang}
          type="button"
          role="tab"
          aria-selected={value === lang}
          onClick={() => onChange(lang)}
          className={cn(
            "relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
            value === lang ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          <span className="font-display text-[11px] tracking-wider uppercase">{lang}</span>
          <span className="hidden sm:inline">{t(lang === "ro" ? "romanian" : "russian")}</span>
          {errors?.[lang] ? <span className="size-1.5 rounded-full bg-danger" aria-hidden /> : null}
        </button>
      ))}
    </div>
  );
}
