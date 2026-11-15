import type { ReactNode } from "react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Section headline with an optional "see all" link on the same baseline. */
export function SectionTitle({
  title,
  sub,
  href,
  linkLabel,
  className,
}: {
  title: ReactNode;
  sub?: ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-5 sm:mb-14 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl">
        <h2 data-reveal className="display text-[clamp(2rem,5.2vw,4rem)] leading-[1.02]">
          {title}
        </h2>
        {sub ? (
          <p data-reveal className="mt-4 max-w-[52ch] text-base leading-relaxed text-muted sm:text-lg">
            {sub}
          </p>
        ) : null}
      </div>
      {href && linkLabel ? (
        <Link
          data-reveal
          href={href}
          className="group inline-flex shrink-0 items-center gap-2 self-start text-[0.9375rem] font-medium md:self-auto"
        >
          <span className="border-b border-line-strong pb-0.5 transition-colors group-hover:border-accent">{linkLabel}</span>
          <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      ) : null}
    </div>
  );
}
