import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { LevelBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BarberLevel } from "@/db/schema";

export function BarberCard({
  slug,
  name,
  photo,
  level,
  locationName,
  sizes,
  className,
  priority,
}: {
  slug: string;
  name: string;
  photo: string | null;
  level: BarberLevel;
  locationName: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link href={`/team/${slug}`} className={cn("group relative block overflow-hidden rounded-2xl bg-surface-2", className)}>
      <div className="relative aspect-[3/4]">
        {photo ? (
          <Image
            src={photo}
            alt={name}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover object-[center_30%] grayscale-[35%] transition-[scale,filter] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.04] group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_35%,var(--surface-3),var(--surface))]">
            <span className="display text-7xl text-fg/15">{name.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-bg/95 via-bg/40 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="font-display text-xl font-semibold tracking-tight">{name}</p>
          <p className="mt-0.5 truncate text-sm text-fg/70">{locationName}</p>
        </div>
        <LevelBadge level={level} className="mb-0.5" />
      </div>
    </Link>
  );
}
