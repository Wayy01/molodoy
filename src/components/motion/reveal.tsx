"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, MOTION_OK, useGSAP } from "./gsap";

/**
 * Fades + lifts children into place as the block enters the viewport, in reading order.
 * Animates `[data-reveal]` descendants if any, otherwise direct children.
 */
export function Reveal({
  children,
  as: Tag = "div",
  className,
  stagger = 0.08,
  y = 28,
  start = "top 85%",
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  stagger?: number;
  y?: number;
  start?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const root = ref.current!;
        const marked = root.querySelectorAll<HTMLElement>("[data-reveal]");
        const targets = marked.length ? Array.from(marked) : Array.from(root.children);
        gsap.from(targets, {
          autoAlpha: 0,
          y,
          duration: 1.1,
          stagger,
          scrollTrigger: { trigger: root, start, once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
