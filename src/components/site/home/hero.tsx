"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Pause, Play } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { gsap, MOTION_OK, useGSAP } from "@/components/motion/gsap";

export function Hero() {
  const t = useTranslations("site.hero");
  const tNav = useTranslations("common.nav");
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
        intro
          .fromTo(".hero-media", { scale: 1.14 }, { scale: 1, duration: 2.6 }, 0)
          .fromTo(".hero-line", { yPercent: 112 }, { yPercent: 0, duration: 1.4, stagger: 0.12 }, 0.15)
          .fromTo(".hero-fade", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.08 }, 0.65);

        // As the hero scrolls away the copy drifts up and the footage pushes in a touch.
        gsap.to(".hero-copy", {
          yPercent: -18,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom 35%", scrub: true },
        });
        gsap.to(".hero-media-wrap", {
          scale: 1.08,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        video.current?.pause();
        setPaused(true);
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  function toggle() {
    const v = video.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  return (
    <section ref={root} className="relative flex min-h-[100svh] items-end overflow-hidden">
      <div className="hero-media-wrap absolute inset-0">
        <video
          ref={video}
          className="hero-media h-full w-full object-cover"
          src="/media/hero/hero.mp4"
          poster="/media/hero/hero.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden
        />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--bg)_2%,color-mix(in_oklch,var(--bg)_55%,transparent)_45%,color-mix(in_oklch,var(--bg)_35%,transparent)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,color-mix(in_oklch,var(--bg)_70%,transparent),transparent_60%)]" />

      <div className="hero-copy container-x relative pt-28 pb-14 sm:pb-20 lg:pb-24">
        <h1 className="display text-[clamp(2.5rem,8.4vw,7.25rem)] leading-[1.02] tracking-[-0.045em]">
          <span className="block overflow-hidden pb-[0.08em]">
            <span className="hero-line block">{t("line1")}</span>
          </span>
          <span className="block overflow-hidden pb-[0.08em]">
            <span className="hero-line block text-accent">{t("line2")}</span>
          </span>
        </h1>
        <p className="hero-fade mt-6 max-w-[34rem] text-base leading-relaxed text-fg/75 sm:text-lg">{t("sub")}</p>
        <div className="hero-fade mt-9 flex flex-wrap items-center gap-3">
          <Link href="/book" className={buttonVariants({ size: "lg" })}>
            {tNav("book")}
            <ArrowRight size={18} weight="bold" />
          </Link>
          <Link href="/work" className={buttonVariants({ size: "lg", variant: "outline", className: "backdrop-blur-sm" })}>
            {t("ctaSecondary")}
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play" : "Pause"}
        className="hero-fade absolute right-4 bottom-6 flex h-11 w-11 items-center justify-center rounded-full border border-line-strong bg-bg/40 text-fg/80 backdrop-blur-md transition-colors hover:text-fg sm:right-6 lg:right-10"
      >
        {paused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="fill" />}
      </button>
    </section>
  );
}
