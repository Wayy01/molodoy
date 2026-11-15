"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { MapPin } from "@phosphor-icons/react";
import { cn, t9n } from "@/lib/utils";
import { setLocationFilter } from "@/app/[locale]/dashboard/actions";
import type { Localized } from "@/db/schema";

/** Owners pick one branch or all of them; everyone else sees their single branch as a label. */
export function LocationSwitcher({
  locations,
  value,
  canChooseAll,
  className,
}: {
  locations: Array<{ id: number; name: Localized }>;
  value: number | null;
  canChooseAll: boolean;
  className?: string;
}) {
  const t = useTranslations("dashboard.location");
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();

  if (!canChooseAll) {
    const only = locations[0];
    return only ? (
      <span className={cn("inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-sm", className)}>
        <MapPin size={16} className="text-accent" />
        {t9n(only.name, locale)}
      </span>
    ) : null;
  }

  return (
    <label className={cn("relative inline-flex h-9 items-center rounded-full border border-line bg-surface text-sm", pending && "opacity-60", className)}>
      <MapPin size={16} className="pointer-events-none absolute left-3 text-accent" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={value ?? ""}
        onChange={(e) =>
          start(async () => {
            await setLocationFilter(e.target.value ? Number(e.target.value) : null);
            router.refresh();
          })
        }
        className="h-full appearance-none rounded-full bg-transparent pr-8 pl-9 font-medium outline-none"
      >
        <option value="">{t("all")}</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {t9n(l.name, locale)}
          </option>
        ))}
      </select>
      <svg aria-hidden viewBox="0 0 256 256" className="pointer-events-none absolute right-3 size-3.5 fill-muted">
        <path d="M213.66 101.66l-80 80a8 8 0 0 1-11.32 0l-80-80a8 8 0 0 1 11.32-11.32L128 164.69l74.34-74.35a8 8 0 0 1 11.32 11.32Z" />
      </svg>
    </label>
  );
}
