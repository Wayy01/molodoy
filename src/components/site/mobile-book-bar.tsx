"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollTrigger, useGSAP } from "@/components/motion/gsap";

/**
 * Thumb-reach booking button on phones, shown once the visitor scrolls past the first screen.
 * Steps aside while an inline booking button (marked `data-book-cta`) is on screen, so the two never stack.
 */
export function MobileBookBar() {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  const [past, setPast] = useState(false);
  const [covered, setCovered] = useState(false);
  const visible = past && !covered;

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        start: () => window.innerHeight * 0.7,
        end: 1e7,
        onToggle: (self) => setPast(self.isActive),
      });
      const cta = document.querySelector("[data-book-cta]");
      const own = cta
        ? ScrollTrigger.create({ trigger: cta, start: "top bottom", end: "bottom top", onToggle: (self) => setCovered(self.isActive) })
        : null;
      return () => {
        st.kill();
        own?.kill();
        setCovered(false);
      };
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  if (pathname.startsWith("/book") || pathname.startsWith("/booking")) return null;

  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0",
      )}
    >
      <Link href="/book" className={buttonVariants({ size: "lg", className: "w-full shadow-[0_16px_40px_-12px_oklch(0_0_0/0.7)]" })}>
        <CalendarCheck size={20} weight="bold" />
        {t("book")}
      </Link>
    </div>
  );
}
