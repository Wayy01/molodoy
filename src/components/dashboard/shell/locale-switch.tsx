"use client";

import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleSwitch({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const search = useSearchParams();

  return (
    <div className={cn("flex rounded-full border border-line bg-surface-2 p-0.5 text-xs font-semibold", className)}>
      {routing.locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(`${pathname}${search.size ? `?${search}` : ""}`, { locale: l })}
          aria-pressed={l === locale}
          className={cn(
            "h-7 rounded-full px-2.5 uppercase transition-colors",
            l === locale ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
