"use client";

import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, MapPin } from "@phosphor-icons/react";
import { cn, t9n } from "@/lib/utils";
import type { BookingLocation } from "./types";

export function StepLocation({ locations, value, onPick }: { locations: BookingLocation[]; value?: number; onPick: (id: number) => void }) {
  const t = useTranslations("booking.location");
  const locale = useLocale();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {locations.map((l) => (
        <button
          key={l.id}
          type="button"
          onClick={() => onPick(l.id)}
          className={cn(
            "group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-surface p-3 text-left transition-[border-color,background-color] duration-300",
            value === l.id ? "border-accent bg-accent-soft" : "border-line hover:border-line-strong hover:bg-surface-2",
          )}
        >
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-3 sm:h-24 sm:w-24">
            {l.photo && <Image src={l.photo} alt="" fill sizes="96px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-semibold tracking-tight">{t9n(l.name, locale)}</p>
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
              <MapPin size={15} className="mt-0.5 shrink-0" />
              <span>{t9n(l.address, locale)}</span>
            </p>
            <p className="mt-1 text-xs text-subtle">{t("barbers", { count: l.barbers })}</p>
          </div>
          <ArrowRight size={18} className="mr-2 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-fg" />
        </button>
      ))}
    </div>
  );
}
