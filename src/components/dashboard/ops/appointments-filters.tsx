"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { FunnelSimple, MagnifyingGlass } from "@phosphor-icons/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn, t9n } from "@/lib/utils";
import { addDays } from "@/lib/time";
import type { Localized } from "@/db/schema";

type Filters = { from: string; to: string; loc: number | null; barber: number | null; status: string | null; q: string };

const STATUSES = ["booked", "completed", "no_show", "cancelled"] as const;

export function AppointmentsFilters({
  filters,
  today,
  barbers,
  locations,
}: {
  filters: Filters;
  today: string;
  barbers: Array<{ id: number; name: string; locationId: number }>;
  /** Branch filter, only for owners looking at all branches. */
  locations: Array<{ id: number; name: Localized }> | null;
}) {
  const t = useTranslations("dashOps.list");
  const tc = useTranslations("dashboard.common");
  const tStatus = useTranslations("common.status");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);
  const [query, setQuery] = useState(filters.q);

  const apply = (patch: Partial<Record<keyof Filters, string | null>>) => {
    const next = new URLSearchParams(search.toString());
    next.delete("page");
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  // Typing searches after a short pause; the URL stays the single source of truth.
  const applyRef = useRef(apply);
  useEffect(() => {
    applyRef.current = apply;
  });
  useEffect(() => {
    if (query.trim() === filters.q) return;
    const id = setTimeout(() => applyRef.current({ q: query.trim() }), 400);
    return () => clearTimeout(id);
  }, [query, filters.q]);

  const presets = [
    { key: "today", from: today, to: today },
    { key: "upcoming", from: today, to: addDays(today, 14) },
    { key: "past30", from: addDays(today, -30), to: today },
  ] as const;

  const barberOptions = filters.loc ? barbers.filter((b) => b.locationId === filters.loc) : barbers;
  const extraCount = [filters.loc, filters.barber, filters.status].filter(Boolean).length;

  const fields = (id: string) => (
    <>
      <Field label={t("from")} htmlFor={`${id}-from`}>
        <Input id={`${id}-from`} type="date" value={filters.from} max={filters.to} onChange={(e) => e.target.value && apply({ from: e.target.value })} className="tabular" />
      </Field>
      <Field label={t("to")} htmlFor={`${id}-to`}>
        <Input id={`${id}-to`} type="date" value={filters.to} min={filters.from} onChange={(e) => e.target.value && apply({ to: e.target.value })} className="tabular" />
      </Field>
      {locations ? (
        <Field label={t("branch")} htmlFor={`${id}-loc`}>
          <Select id={`${id}-loc`} value={filters.loc ?? ""} onChange={(e) => apply({ loc: e.target.value, barber: null })}>
            <option value="">{tc("all")}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {t9n(l.name, locale)}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      {barberOptions.length > 1 ? (
        <Field label={t("barber")} htmlFor={`${id}-barber`}>
          <Select id={`${id}-barber`} value={filters.barber ?? ""} onChange={(e) => apply({ barber: e.target.value })}>
            <option value="">{tc("all")}</option>
            {barberOptions.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={t("status")} htmlFor={`${id}-status`}>
        <Select id={`${id}-status`} value={filters.status ?? ""} onChange={(e) => apply({ status: e.target.value })}>
          <option value="">{tc("all")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatus(s)}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );

  return (
    <div className={cn("mb-5 flex flex-col gap-3 transition-opacity", pending && "opacity-60")}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {presets.map((p) => {
            const active = filters.from === p.from && filters.to === p.to;
            return (
              <button
                key={p.key}
                type="button"
                aria-pressed={active}
                onClick={() => apply({ from: p.from, to: p.to })}
                className={cn(
                  "h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors md:h-9",
                  active ? "border-fg bg-fg text-bg" : "border-line-strong hover:bg-surface-2",
                )}
              >
                {t(`presets.${p.key}`)}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 md:ml-auto md:w-80">
          <div className="relative flex-1">
            <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={tc("search")}
              className="pl-10"
            />
          </div>
          <Button variant="secondary" className="relative md:hidden" onClick={() => setSheet(true)} aria-label={tc("filter")}>
            <FunnelSimple size={18} />
            {extraCount ? (
              <span className="tabular absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-fg">
                {extraCount}
              </span>
            ) : null}
          </Button>
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-3 lg:grid-cols-5">{fields("f")}</div>

      {sheet ? (
        <Dialog open onClose={() => setSheet(false)} title={tc("filter")} footer={<Button onClick={() => setSheet(false)}>{t("showResults")}</Button>}>
          <div className="flex flex-col gap-4">{fields("sheet")}</div>
        </Dialog>
      ) : null}
    </div>
  );
}
