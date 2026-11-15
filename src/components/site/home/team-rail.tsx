"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { BarberCard } from "@/components/site/barber-card";
import { cn, t9n } from "@/lib/utils";
import type { BarberLevel, Localized } from "@/db/schema";

type RailBarber = { id: number; slug: string; name: string; photo: string | null; level: BarberLevel; locationId: number };

export function TeamRail({ barbers, locations }: { barbers: RailBarber[]; locations: Array<{ id: number; name: Localized }> }) {
  const t = useTranslations("site.team");
  const locale = useLocale();
  const [filter, setFilter] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const shown = filter ? barbers.filter((b) => b.locationId === filter) : barbers;
  const nameOf = (id: number) => t9n(locations.find((l) => l.id === id)?.name, locale);

  function scroll(dir: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  function pick(id: number | null) {
    setFilter(id);
    track.current?.scrollTo({ left: 0 });
  }

  return (
    <div>
      <div className="container-x mb-8 flex items-center justify-between gap-4">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {[{ id: null, label: t("all") }, ...locations.map((l) => ({ id: l.id, label: t9n(l.name, locale) }))].map((c) => (
            <button
              key={c.id ?? "all"}
              type="button"
              onClick={() => pick(c.id)}
              aria-pressed={filter === c.id}
              className={cn(
                "h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors",
                filter === c.id ? "border-fg bg-fg text-bg" : "border-line-strong text-muted hover:border-fg hover:text-fg",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="hidden gap-2 md:flex">
          <button type="button" onClick={() => scroll(-1)} aria-label="Previous" className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong hover:border-fg">
            <ArrowLeft size={18} />
          </button>
          <button type="button" onClick={() => scroll(1)} aria-label="Next" className="flex h-11 w-11 items-center justify-center rounded-full border border-line-strong hover:border-fg">
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <div
        ref={track}
        className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:scroll-px-10 lg:px-10"
      >
        {shown.map((b, i) => (
          <BarberCard
            key={b.id}
            slug={b.slug}
            name={b.name}
            photo={b.photo}
            level={b.level}
            locationName={nameOf(b.locationId)}
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 40vw, 70vw"
            priority={i < 2}
            className="w-[70vw] shrink-0 snap-start sm:w-[40vw] lg:w-[calc((100vw-5rem-3rem)/4.3)] 2xl:w-[300px]"
          />
        ))}
      </div>
    </div>
  );
}
