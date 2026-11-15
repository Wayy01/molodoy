import Image from "next/image";
import { cn } from "@/lib/utils";

/** Photo when there is one, otherwise a monogram on the brand surface. */
export function Avatar({ src, name, size = 40, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3", className)}
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes={`${size * 2}px`} className="object-cover object-top" />
      ) : (
        <span className="font-display text-fg/80" style={{ fontSize: size * 0.36 }}>
          {initials}
        </span>
      )}
    </span>
  );
}
