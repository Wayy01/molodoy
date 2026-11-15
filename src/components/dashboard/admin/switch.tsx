"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** On/off toggle with its label; the whole row is the tap target. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-11 w-full items-center justify-between gap-4 text-left disabled:opacity-50", className)}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description ? <span className="mt-0.5 block text-sm text-muted">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors duration-200",
          checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 size-6 rounded-full bg-fg shadow-sm transition-transform duration-200 ease-out",
            checked && "translate-x-5 bg-accent-fg",
          )}
        />
      </span>
    </button>
  );
}
