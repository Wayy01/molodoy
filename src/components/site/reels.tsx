"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowUpRight, Play, SpeakerHigh, SpeakerSlash, TiktokLogo, X } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Reel = {
  id: number;
  kind: "video" | "tiktok";
  src: string;
  poster: string | null;
  caption: string;
  barber?: string | null;
};

function tiktokId(url: string) {
  return url.match(/video\/(\d+)/)?.[1] ?? null;
}

/** Plays muted while mostly on screen, pauses when it leaves, so only what you look at uses bandwidth. */
function useAutoplay(ref: React.RefObject<HTMLVideoElement | null>, threshold = 0.6) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
}

function ReelCard({ reel, onOpen, className }: { reel: Reel; onOpen: () => void; className?: string }) {
  const t = useTranslations("site.reels");
  const video = useRef<HTMLVideoElement>(null);
  useAutoplay(video);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${t("play")}: ${reel.caption}`}
      className={cn("group relative block aspect-[9/16] overflow-hidden rounded-2xl bg-surface-2 text-left", className)}
    >
      {reel.kind === "video" ? (
        <video
          ref={video}
          src={reel.src}
          poster={reel.poster ?? undefined}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.03]"
        />
      ) : reel.poster ? (
        <Image src={reel.poster} alt="" fill sizes="300px" className="object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,var(--surface-3),var(--surface))]">
          <TiktokLogo size={48} className="text-fg/30" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent" />
      <span className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-bg/50 backdrop-blur-md transition-transform duration-300 group-hover:scale-110">
        {reel.kind === "tiktok" ? <TiktokLogo size={16} /> : <Play size={14} weight="fill" />}
      </span>
      <span className="absolute inset-x-0 bottom-0 p-3.5 text-sm leading-snug font-medium sm:p-4">
        {reel.caption}
        {reel.barber ? <span className="mt-0.5 block text-xs font-normal text-fg/60">{reel.barber}</span> : null}
      </span>
    </button>
  );
}

function ViewerSlide({ reel, muted, onToggleMute }: { reel: Reel; muted: boolean; onToggleMute: () => void }) {
  const t = useTranslations("site.reels");
  const tNav = useTranslations("common.nav");
  const video = useRef<HTMLVideoElement>(null);
  useAutoplay(video, 0.7);
  const id = reel.kind === "tiktok" ? tiktokId(reel.src) : null;

  return (
    <div className="relative flex h-[100dvh] snap-start snap-always items-center justify-center">
      <div className="relative h-full w-full sm:h-[92dvh] sm:w-auto sm:aspect-[9/16] sm:overflow-hidden sm:rounded-3xl">
        {reel.kind === "video" ? (
          <video ref={video} src={reel.src} poster={reel.poster ?? undefined} muted={muted} loop playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
        ) : id ? (
          <iframe
            src={`https://www.tiktok.com/player/v1/${id}?autoplay=1&loop=1&music_info=0&description=0`}
            className="h-full w-full bg-black"
            allow="autoplay; fullscreen; encrypted-media"
            loading="lazy"
            title={reel.caption}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            <p className="font-medium">{reel.caption}</p>
            {reel.barber ? <p className="text-sm text-fg/70">{reel.barber}</p> : null}
            <Link href="/book" className={buttonVariants({ size: "sm", className: "mt-3" })}>
              {tNav("book")}
            </Link>
          </div>
          {reel.kind === "video" ? (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? t("unmute") : t("mute")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
            >
              {muted ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
            </button>
          ) : (
            <a href={reel.src} target="_blank" rel="noreferrer" className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-4 text-sm backdrop-blur-md">
              {t("openTikTok")} <ArrowUpRight size={14} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/** TikTok-style vertical feed: swipe up for the next clip. */
function Viewer({ reels, start, onClose }: { reels: Reel[]; start: number; onClose: () => void }) {
  const t = useTranslations("site.reels");
  const list = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    list.current?.children[start]?.scrollIntoView({ block: "start" });
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [start]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={t("title")} className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md">
      <div ref={list} className="no-scrollbar h-full snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {reels.map((r) => (
          <ViewerSlide key={r.id} reel={r} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("close")}
        className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
      >
        <X size={20} />
      </button>
    </div>
  );
}

/** Staggered grid on desktop, swipeable rail on phones. */
export function Reels({ reels, layout = "rail" }: { reels: Reel[]; layout?: "rail" | "grid" }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      {layout === "rail" ? (
        <div className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 sm:scroll-px-6 sm:px-6 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible lg:grid-cols-6 lg:px-10">
          {reels.map((r, i) => (
            <ReelCard key={r.id} reel={r} onOpen={() => setOpen(i)} className={cn("w-[58vw] shrink-0 snap-start sm:w-[36vw] md:w-auto", i % 2 === 1 && "lg:translate-y-12")} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {reels.map((r, i) => (
            <ReelCard key={r.id} reel={r} onOpen={() => setOpen(i)} />
          ))}
        </div>
      )}
      {open !== null && <Viewer reels={reels} start={open} onClose={() => setOpen(null)} />}
    </>
  );
}
