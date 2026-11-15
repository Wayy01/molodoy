import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import type { BarberLevel } from "@/db/schema";

type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border-line",
  accent: "bg-accent-soft text-accent border-accent/25",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-info/12 text-info border-info/25",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

const LEVEL_TONE: Record<BarberLevel, Tone> = { top: "accent", pro: "neutral", barber: "neutral" };

/** BARBER / PRO / TOP tier chip. The tier decides the price. */
export function LevelBadge({ level, className }: { level: BarberLevel; className?: string }) {
  return (
    <Badge tone={LEVEL_TONE[level]} className={cn("font-display text-[10px] tracking-[0.08em] uppercase", className)}>
      {level}
    </Badge>
  );
}
