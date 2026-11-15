"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn, formatMDL, t9n } from "@/lib/utils";
import type { BarberLevel, Localized } from "@/db/schema";

type Row = {
  id: number;
  name: Localized;
  description: Localized | null;
  durationMin: number;
  prices: Record<BarberLevel, number | null>;
};

const LEVELS: BarberLevel[] = ["barber", "pro", "top"];

/** Full matrix from `md` up; on phones a tier switch keeps it to one readable column of prices. */
export function PriceMatrix({ rows, showDescriptions = false }: { rows: Row[]; showDescriptions?: boolean }) {
  const t = useTranslations("site.prices");
  const tl = useTranslations("common.levels");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [tier, setTier] = useState<BarberLevel>("pro");

  return (
    <div>
      <div role="tablist" aria-label={t("tier")} className="mb-6 grid grid-cols-3 rounded-full border border-line-strong p-1 md:hidden">
        {LEVELS.map((l) => (
          <button
            key={l}
            role="tab"
            type="button"
            aria-selected={tier === l}
            onClick={() => setTier(l)}
            className={cn(
              "h-10 rounded-full font-display text-xs font-semibold tracking-[0.08em] uppercase transition-colors",
              tier === l ? "bg-fg text-bg" : "text-muted",
            )}
          >
            {tl(l)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="hidden grid-cols-[1.6fr_repeat(3,1fr)] border-b border-line bg-surface md:grid">
          <div className="px-6 py-5 text-sm text-muted">{t("service")}</div>
          {LEVELS.map((l) => (
            <div key={l} className="border-l border-line px-6 py-5">
              <p className="font-display text-sm font-semibold tracking-[0.08em] uppercase">{tl(l)}</p>
              <p className="mt-1 text-xs text-muted">{tl(`${l}Hint`)}</p>
            </div>
          ))}
        </div>
        {rows.map((r, i) => (
          <div
            key={r.id}
            className={cn("grid grid-cols-[1fr_auto] items-center md:grid-cols-[1.6fr_repeat(3,1fr)]", i % 2 === 1 && "bg-surface/60")}
          >
            <div className="px-5 py-4 md:px-6 md:py-5">
              <p className="font-medium">{t9n(r.name, locale)}</p>
              <p className="tabular mt-0.5 text-sm text-muted">
                {tc("time.min", { count: r.durationMin })}
                {showDescriptions && r.description ? <span className="hidden sm:inline">{`, ${t9n(r.description, locale).toLowerCase()}`}</span> : null}
              </p>
            </div>
            {LEVELS.map((l) => (
              <div
                key={l}
                className={cn(
                  "tabular px-5 py-4 text-right md:border-l md:border-line md:px-6 md:py-5 md:text-left",
                  l !== tier && "hidden md:block",
                )}
              >
                {r.prices[l] != null ? (
                  <span className={cn("font-display text-[1.0625rem] font-medium", l === "top" && "text-accent")}>
                    {formatMDL(r.prices[l]!, locale)}
                  </span>
                ) : (
                  <span className="text-sm text-subtle">-</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
