"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { gsap, MOTION_OK, useGSAP } from "./gsap";

/** A statement that lights up word by word as it scrolls through the viewport. */
export function ScrubWords({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const words = ref.current!.querySelectorAll("span");
        gsap.fromTo(
          words,
          { opacity: 0.14 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: ref.current, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <p ref={ref} className={cn(className)}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block">
          {w}
          {" "}
        </span>
      ))}
    </p>
  );
}
