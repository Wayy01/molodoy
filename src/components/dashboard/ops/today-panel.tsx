"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, CalendarCheck, CheckCircle, UserMinus } from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { cn, t9n } from "@/lib/utils";
import { timeKey } from "@/lib/time";
import { setAppointmentStatus } from "@/lib/dashboard/ops/actions";
import type { OpsAppointment } from "@/lib/dashboard/ops/types";
import { AppointmentDialog } from "./appointment-dialog";
import { useNow } from "./use-now";

/** Today's remaining bookings with one-tap outcome buttons; the ones already past their end come first. */
export function TodayPanel({ rows, total, showBranch }: { rows: OpsAppointment[]; total: number; showBranch: boolean }) {
  const t = useTranslations("dashOps.overview.today");
  const tErr = useTranslations("dashOps.errors");
  const tc = useTranslations("dashboard.common");
  const locale = useLocale();
  const now = useNow();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, start] = useTransition();
  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;

  const mark = (a: OpsAppointment, status: "completed" | "no_show") => {
    setBusyId(a.id);
    start(async () => {
      const res = await setAppointmentStatus(a.id, status);
      setBusyId(null);
      if (res.ok) toast.success(status === "completed" ? t("markedCompleted", { name: a.client.name }) : t("markedNoShow", { name: a.client.name }));
      else toast.error(tErr.has(res.error) ? tErr(res.error) : tc("error"));
    });
  };

  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("title")}</h2>
          <p className="mt-0.5 text-sm text-muted">{t("left", { count: total })}</p>
        </div>
        <Link href="/dashboard/calendar" className="inline-flex h-11 items-center gap-1 rounded-full px-3 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg sm:h-9">
          {t("calendar")}
          <ArrowRight size={14} />
        </Link>
      </header>

      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-center">
          <CalendarCheck size={28} className="text-muted" />
          <p className="text-sm text-muted">{t("empty")}</p>
        </div>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {rows.map((a) => {
            const overdue = now !== null && a.endsAt.getTime() < now;
            const busy = busyId === a.id;
            return (
              <li key={a.id} className={cn("flex items-center gap-1 rounded-xl transition-opacity", busy && "opacity-50")}>
                <button type="button" onClick={() => setSelectedId(a.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-surface-2">
                  <span className={cn("tabular w-11 shrink-0 text-sm font-semibold", overdue && "text-warning")}>{timeKey(a.startsAt)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{a.client.name}</span>
                      {overdue ? (
                        <Badge tone="warning" className="h-5 shrink-0 px-2 text-[10px]">
                          {t("overdue")}
                        </Badge>
                      ) : null}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {t9n(a.service.name, locale)} · {a.barber.name}
                      {showBranch ? ` · ${t9n(a.location.name, locale)}` : ""}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mark(a, "completed")}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-success hover:bg-success/12"
                  aria-label={t("complete", { name: a.client.name })}
                  title={t("completeShort")}
                >
                  <CheckCircle size={22} />
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => mark(a, "no_show")}
                  className="flex size-11 shrink-0 items-center justify-center rounded-full text-warning hover:bg-warning/12"
                  aria-label={t("noShow", { name: a.client.name })}
                  title={t("noShowShort")}
                >
                  <UserMinus size={22} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected ? <AppointmentDialog key={selected.id} appointment={selected} onClose={() => setSelectedId(null)} /> : null}
    </section>
  );
}
