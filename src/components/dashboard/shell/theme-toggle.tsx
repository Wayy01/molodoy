"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Desktop, Moon, Sun } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { setDashboardTheme } from "@/app/[locale]/dashboard/actions";
import type { DashboardTheme } from "@/lib/dashboard/context";

const OPTIONS = [
  { value: "system", icon: Desktop },
  { value: "light", icon: Sun },
  { value: "dark", icon: Moon },
] as const;

export function ThemeToggle({ theme }: { theme: DashboardTheme }) {
  const t = useTranslations("dashboard.theme");
  const router = useRouter();
  const [, start] = useTransition();

  return (
    <div role="radiogroup" aria-label={t("label")} className="flex rounded-full border border-line bg-surface-2 p-0.5">
      {OPTIONS.map(({ value, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          title={t(value)}
          onClick={() =>
            start(async () => {
              await setDashboardTheme(value);
              router.refresh();
            })
          }
          className={cn(
            "flex h-7 w-8 items-center justify-center rounded-full transition-colors",
            theme === value ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
