"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";

export type GalleryPhoto = { id: number; src: string; caption: string; by?: string | null; width: number | null; height: number | null };

/** Masonry grid; tapping a photo opens a swipeable full-screen viewer. */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpen(i)}
            className="group relative mb-3 block w-full overflow-hidden rounded-2xl bg-surface-2 sm:mb-4"
          >
            <Image
              src={p.src}
              alt={p.caption}
              width={p.width ?? 800}
              height={p.height ?? 1000}
              sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
              className="h-auto w-full transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
            />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-bg/85 to-transparent p-3 pt-10 text-left text-sm opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {p.caption}
              {p.by ? <span className="block text-xs text-fg/60">{p.by}</span> : null}
            </span>
          </button>
        ))}
      </div>
      {open !== null && <Lightbox photos={photos} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function Lightbox({ photos, start, onClose }: { photos: GalleryPhoto[]; start: number; onClose: () => void }) {
  const t = useTranslations("site.reels");
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    track.current?.children[start]?.scrollIntoView({ inline: "start", block: "nearest" });
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function step(dir: 1 | -1) {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
      <div ref={track} className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto overscroll-contain">
        {photos.map((p) => (
          <figure key={p.id} className="flex h-full w-full shrink-0 snap-center flex-col items-center justify-center gap-4 p-4 sm:p-12">
            <div className="relative h-full max-h-[80dvh] w-full">
              <Image src={p.src} alt={p.caption} fill sizes="100vw" className="object-contain" />
            </div>
            <figcaption className="text-center text-sm text-fg/80">
              {p.caption}
              {p.by ? <span className="ml-2 text-fg/50">{p.by}</span> : null}
            </figcaption>
          </figure>
        ))}
      </div>
      <button type="button" onClick={onClose} aria-label={t("close")} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
        <X size={20} />
      </button>
      <button type="button" onClick={() => step(-1)} aria-label="Previous" className="absolute top-1/2 left-4 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 md:flex">
        <CaretLeft size={20} />
      </button>
      <button type="button" onClick={() => step(1)} aria-label="Next" className="absolute top-1/2 right-4 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 md:flex">
        <CaretRight size={20} />
      </button>
    </div>
  );
}
