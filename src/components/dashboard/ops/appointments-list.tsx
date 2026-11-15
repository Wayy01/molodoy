"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ListChecks } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMDL, formatPhone, t9n } from "@/lib/utils";
import { timeKey } from "@/lib/time";
import type { OpsAppointment } from "@/lib/dashboard/ops/types";
import { AppointmentDialog } from "./appointment-dialog";
import { StatusBadge } from "./status-badge";

export function AppointmentsList({ rows }: { rows: OpsAppointment[] }) {
  const t = useTranslations("dashOps.list");
  const tSource = useTranslations("common.source");
  const locale = useLocale();
  const format = useFormatter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;

  if (rows.length === 0) {
    return <EmptyState icon={<ListChecks />} title={t("empty")} description={t("emptyHint")} />;
  }

  const day = (d: Date) => format.dateTime(d, { weekday: "short", day: "numeric", month: "short" });

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-line bg-surface md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-surface-2/60 text-left text-xs text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">{t("cols.date")}</th>
              <th className="px-3 py-3 font-medium">{t("cols.time")}</th>
              <th className="px-3 py-3 font-medium">{t("cols.client")}</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell">{t("cols.phone")}</th>
              <th className="px-3 py-3 font-medium">{t("cols.service")}</th>
              <th className="px-3 py-3 font-medium">{t("cols.barber")}</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell">{t("cols.branch")}</th>
              <th className="px-3 py-3 text-right font-medium">{t("cols.price")}</th>
              <th className="px-3 py-3 font-medium">{t("cols.status")}</th>
              <th className="hidden px-4 py-3 font-medium 2xl:table-cell">{t("cols.source")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((a) => (
              <tr key={a.id} onClick={() => setSelectedId(a.id)} className="cursor-pointer transition-colors hover:bg-surface-2/60">
                <td className="px-4 py-3 whitespace-nowrap first-letter:uppercase">{day(a.startsAt)}</td>
                <td className="tabular px-3 py-3 whitespace-nowrap">{timeKey(a.startsAt)}</td>
                <td className="max-w-48 px-3 py-3">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(a.id);
                    }}
                    className="block max-w-full truncate text-left font-medium hover:underline"
                  >
                    {a.client.name}
                  </button>
                </td>
                <td className="tabular hidden px-3 py-3 whitespace-nowrap text-muted lg:table-cell">{formatPhone(a.client.phone)}</td>
                <td className="max-w-44 truncate px-3 py-3">{t9n(a.service.name, locale)}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <Avatar src={a.barber.photo} name={a.barber.name} size={24} />
                    {a.barber.name}
                  </span>
                </td>
                <td className="hidden px-3 py-3 whitespace-nowrap text-muted xl:table-cell">{t9n(a.location.name, locale)}</td>
                <td className="tabular px-3 py-3 text-right whitespace-nowrap">{formatMDL(a.price, locale)}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={a.status} />
                </td>
                <td className="hidden px-4 py-3 whitespace-nowrap text-muted 2xl:table-cell">{tSource(a.source)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-2 md:hidden">
        {rows.map((a) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => setSelectedId(a.id)}
              className="flex w-full flex-col gap-2 rounded-2xl border border-line bg-surface p-4 text-left active:bg-surface-2"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="tabular text-sm text-muted first-letter:uppercase">
                  {day(a.startsAt)} · <span className="font-semibold text-fg">{timeKey(a.startsAt)}</span>
                </span>
                <StatusBadge status={a.status} />
              </span>
              <span className="flex items-end justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.client.name}</span>
                  <span className="block truncate text-sm text-muted">
                    {t9n(a.service.name, locale)} · {a.barber.name}
                  </span>
                </span>
                <span className="tabular shrink-0 text-sm font-medium">{formatMDL(a.price, locale)}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selected ? <AppointmentDialog key={selected.id} appointment={selected} onClose={() => setSelectedId(null)} /> : null}
    </>
  );
}
