import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The standard dashboard card. */
export function Card({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-surface p-4 sm:p-6", className)}>
      {title || actions ? (
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-base font-semibold">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * Save row for long forms. Phones: pinned above the tab bar. Desktop: a floating pill at the bottom right.
 * Forms using it need `pb-24 lg:pb-0` so the last field isn't hidden behind it.
 */
export function SaveBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-end gap-2 border-t border-line bg-bg/90 px-4 py-3 backdrop-blur-xl",
        "lg:sticky lg:inset-x-auto lg:bottom-6 lg:mt-6 lg:ml-auto lg:w-fit lg:rounded-full lg:border lg:bg-surface/90 lg:p-2 lg:shadow-card",
        "[&>*]:flex-1 sm:[&>*]:flex-none",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Small label + big number tile. */
export function Stat({ label, value, hint, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-line bg-surface p-4", className)}>
      <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
      <p className="tabular mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-subtle">{hint}</p> : null}
    </div>
  );
}
