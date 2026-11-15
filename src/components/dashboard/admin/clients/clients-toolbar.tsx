"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CircleNotch, MagnifyingGlass, X } from "@phosphor-icons/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { ClientSort } from "@/lib/dashboard/admin/clients";

const SORTS: ClientSort[] = ["last", "visits", "spent", "name"];

/** Search (debounced into the URL) and sort chips. The server page reads both from searchParams. */
export function ClientsToolbar({ q, sort }: { q: string; sort: ClientSort }) {
  const t = useTranslations("dashAdmin.clients");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();
  const [value, setValue] = useState(q);
  const first = useRef(true);

  function go(next: { q?: string; sort?: ClientSort }) {
    const query: Record<string, string> = {};
    const nq = next.q ?? value;
    const ns = next.sort ?? sort;
    if (nq.trim()) query.q = nq.trim();
    if (ns !== "last") query.sort = ns;
    start(() => router.replace({ pathname, query }, { scroll: false }));
  }

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => go({ q: value }), 300);
    return () => clearTimeout(id);
    // Only the typed value should re-trigger the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: value });
        }}
        className="relative md:max-w-sm md:flex-1"
      >
        <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          enterKeyHint="search"
          className="h-11 w-full rounded-xl border border-line-strong bg-surface pr-11 pl-10 text-[0.9375rem] text-fg outline-none placeholder:text-subtle focus:border-accent focus:ring-4 focus:ring-accent/15 [&::-webkit-search-cancel-button]:hidden"
        />
        {pending ? (
          <CircleNotch size={18} className="absolute top-1/2 right-3.5 -translate-y-1/2 animate-spin text-muted" />
        ) : value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            aria-label={t("clearSearch")}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-fg"
          >
            <X size={16} />
          </button>
        ) : null}
      </form>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0" role="radiogroup" aria-label={t("sortLabel")}>
        {SORTS.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={s === sort}
            onClick={() => go({ sort: s })}
            className={cn(
              "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors md:h-9",
              s === sort ? "border-fg bg-fg text-bg" : "border-line bg-surface text-muted hover:text-fg",
            )}
          >
            {t(`sort.${s}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
