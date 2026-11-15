"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { List, X, Phone } from "@phosphor-icons/react";
import { Link, usePathname } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatPhone } from "@/lib/utils";
import { gsap, MOTION_OK, ScrollTrigger, useGSAP } from "@/components/motion/gsap";
import { LocaleToggle } from "./locale-toggle";

const LINKS = [
  { href: "/prices", key: "services" },
  { href: "/team", key: "team" },
  { href: "/work", key: "work" },
  { href: "/locations", key: "locations" },
  { href: "/blog", key: "blog" },
] as const;

export function Header({ phone }: { phone: string }) {
  const t = useTranslations("common.nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBooking = pathname.startsWith("/book");

  // Solid background after leaving the top; slide away while scrolling down, back on scroll up.
  useGSAP(() => {
    // `anchor` is where the current scroll direction started. The header only flips after a deliberate run
    // in one direction, so touch momentum, tiny reversals and the iOS end-of-page bounce can't flicker it.
    let last = 0;
    let anchor = 0;
    let dir = 0;
    // A fixed, huge end keeps this active on every page, whatever its height after client navigation.
    const st = ScrollTrigger.create({
      start: 0,
      end: 1e7,
      onUpdate: (self) => {
        const y = self.scroll();
        const d = y > last ? 1 : y < last ? -1 : dir;
        if (d !== dir) {
          dir = d;
          anchor = last;
        }
        last = y;
        setScrolled(y > 24);
        if (y < 480) setHidden(false);
        else if (y < ScrollTrigger.maxScroll(window) - 2 && Math.abs(y - anchor) > 16) setHidden(dir === 1);
      },
    });
    return () => st.kill();
  });

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // Close the menu when the route changes (adjusting state during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useGSAP(
    () => {
      if (!open) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from("[data-menu-item]", { yPercent: 110, duration: 0.9, stagger: 0.05, ease: "expo.out" });
        gsap.from("[data-menu-foot]", { autoAlpha: 0, y: 12, duration: 0.6, delay: 0.25 });
      });
      return () => mm.revert();
    },
    { dependencies: [open], scope: menuRef },
  );

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-[translate,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]",
          // Phones get a near-solid bar: a backdrop blur re-rendered on every scroll frame is what makes them stutter.
          scrolled || open ? "border-b border-line bg-bg/95 sm:bg-bg/80 sm:backdrop-blur-xl" : "border-b border-transparent",
          hidden && !open && "-translate-y-full",
        )}
      >
        <div className="container-x flex h-16 items-center gap-6 lg:h-[72px]">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Molodoy Barbershop">
            <Image src="/logo.webp" alt="" width={36} height={36} priority className="rounded-[10px]" />
            <span className="font-display text-[15px] font-semibold tracking-tight">MOLODOY</span>
          </Link>

          <nav className="ml-6 hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "relative py-2 text-[0.9375rem] transition-colors",
                    active ? "text-fg" : "text-muted hover:text-fg",
                    "after:absolute after:inset-x-0 after:bottom-0.5 after:h-px after:origin-left after:bg-accent after:transition-transform after:duration-500",
                    active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100",
                  )}
                >
                  {t(l.key)}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <LocaleToggle className="hidden sm:flex" />
            {!isBooking && (
              <Link href="/book" className={buttonVariants({ size: "sm", className: "hidden sm:inline-flex" })}>
                {t("book")}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? t("close") : t("menu")}
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-fg hover:bg-surface-2 lg:hidden"
            >
              {open ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div ref={menuRef} className="fixed inset-0 z-30 flex flex-col bg-bg px-4 pt-24 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
          <nav className="flex flex-col">
            {[{ href: "/", key: "home" } as const, ...LINKS].map((l) => (
              <span key={l.href} className="overflow-hidden">
                <Link
                  data-menu-item
                  href={l.href}
                  className={cn(
                    "display block py-2 text-[2.6rem] sm:text-6xl",
                    pathname === l.href ? "text-accent" : "text-fg",
                  )}
                >
                  {t(l.key)}
                </Link>
              </span>
            ))}
          </nav>
          <div data-menu-foot className="mt-auto flex flex-col gap-5">
            <Link href="/book" className={buttonVariants({ size: "lg", className: "w-full" })}>
              {t("book")}
            </Link>
            <div className="flex items-center justify-between">
              <a href={`tel:${phone}`} className="flex items-center gap-2 text-muted">
                <Phone size={18} /> {formatPhone(phone)}
              </a>
              <LocaleToggle />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
