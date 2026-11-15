"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();

  return (
    <div className={cn("flex items-center gap-1 text-[13px] font-semibold tracking-wide", className)}>
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 && <span className="text-subtle">/</span>}
          <button
            type="button"
            aria-pressed={l === locale}
            onClick={() =>
              // @ts-expect-error -- pathname + params always come from the current route, so they match
              router.replace({ pathname, params }, { locale: l, scroll: false })
            }
            className={cn("px-1 py-2 uppercase transition-colors", l === locale ? "text-fg" : "text-subtle hover:text-fg")}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}
