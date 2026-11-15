"use client";

import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { gsap, MOTION_OK, useGSAP } from "./gsap";

/** Media that wipes open from the bottom when it scrolls into view, with a slow settle on the inner image. */
export function ClipReveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const el = ref.current!;
        const tl = gsap.timeline({ delay, scrollTrigger: { trigger: el, start: "top 88%", once: true } });
        tl.from(el, { clipPath: "inset(100% 0% 0% 0%)", duration: 1.3, ease: "expo.inOut" });
        if (el.firstElementChild) tl.from(el.firstElementChild, { scale: 1.18, duration: 1.8, ease: "expo.out" }, 0.1);
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={cn("overflow-hidden", className)}>
      {children}
    </div>
  );
}
