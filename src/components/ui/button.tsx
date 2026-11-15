import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "inverse";
type Size = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-surface-2 text-fg hover:bg-surface-3 border border-line",
  ghost: "text-fg hover:bg-surface-2",
  outline: "border border-line-strong text-fg hover:bg-fg hover:text-bg",
  danger: "bg-danger/12 text-danger hover:bg-danger/20 border border-danger/25",
  inverse: "bg-fg text-bg hover:bg-fg/90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-5 text-[0.9375rem] gap-2",
  lg: "h-14 px-7 text-base gap-2.5",
  icon: "h-10 w-10 justify-center",
};

/** Class string for anything that should look like a button (links included). Buttons are always pills. */
export function buttonVariants({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-medium select-none",
    "transition-[background-color,color,scale,box-shadow] duration-200 ease-out active:scale-[0.97]",
    "disabled:pointer-events-none disabled:opacity-45",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonVariants({ variant, size, className })} {...props} />;
}
