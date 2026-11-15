"use client";

import { useEffect, useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { addTimeOff, listTimeOff, removeTimeOff } from "@/lib/dashboard/ops/actions";
import type { OpsBarber, OpsTimeOff } from "@/lib/dashboard/ops/types";
import { dateKey, timeKey } from "@/lib/time";

export function TimeOffDialog({
  barbers,
  barberId: initialBarberId,
  date,
  onClose,
}: {
  barbers: OpsBarber[];
  barberId: number | null;
  date: string;
  onClose: () => void;
}) {
  const t = useTranslations("dashOps.timeOff");
  const tc = useTranslations("dashboard.common");
  const tErr = useTranslations("dashOps.errors");
  const format = useFormatter();

  const [barberId, setBarberId] = useState(initialBarberId ?? barbers[0]?.id ?? 0);
  const [start, setStart] = useState(`${date}T13:00`);
  const [end, setEnd] = useState(`${date}T14:00`);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [version, setVersion] = useState(0);
  const [list, setList] = useState<{ key: string; rows: OpsTimeOff[] } | null>(null);
  const [pending, startTransition] = useTransition();
  const listKey = `${barberId}|${version}`;

  useEffect(() => {
    let live = true;
    listTimeOff(barberId).then((rows) => live && setList({ key: `${barberId}|${version}`, rows }));
    return () => {
      live = false;
    };
  }, [barberId, version]);

  // Built by hand: Intl ranges join with an en dash.
  const range = (o: OpsTimeOff) => {
    const opts = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } as const;
    const end = dateKey(o.startsAt) === dateKey(o.endsAt) ? timeKey(o.endsAt) : format.dateTime(o.endsAt, opts);
    return `${format.dateTime(o.startsAt, opts)} - ${end}`;
  };

  return (
    <Dialog open onClose={onClose} title={t("title")} className="sm:max-w-lg">
      <div className="flex flex-col gap-6">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!start || !end) return setErrors({ ...(start ? {} : { start: "required" }), ...(end ? {} : { end: "required" }) });
            if (end <= start) return setErrors({ end: "order" });
            startTransition(async () => {
              const res = await addTimeOff({ barberId, start, end, reason });
              if (res.ok) {
                toast.success(t("added"));
                setReason("");
                setErrors({});
                setVersion((v) => v + 1);
              } else if (res.fields) setErrors(res.fields);
              else toast.error(tErr.has(res.error) ? tErr(res.error) : tc("error"));
            });
          }}
        >
          {barbers.length > 1 ? (
            <Field label={t("barber")} htmlFor="to-barber">
              <Select id="to-barber" value={barberId} onChange={(e) => setBarberId(Number(e.target.value))}>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("start")} htmlFor="to-start" error={errors.start ? tErr("required") : undefined}>
              <Input
                id="to-start"
                type="datetime-local"
                step={1800}
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setErrors({});
                }}
                aria-invalid={!!errors.start}
              />
            </Field>
            <Field
              label={t("end")}
              htmlFor="to-end"
              error={errors.end ? (errors.end === "order" ? tErr("endBeforeStart") : tErr("required")) : undefined}
            >
              <Input
                id="to-end"
                type="datetime-local"
                step={1800}
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setErrors({});
                }}
                aria-invalid={!!errors.end}
              />
            </Field>
          </div>
          <Field label={t("reason")} htmlFor="to-reason" hint={t("reasonHint")}>
            <Input id="to-reason" value={reason} maxLength={120} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <Button type="submit" disabled={pending} className="self-start">
            {pending ? tc("loading") : t("add")}
          </Button>
        </form>

        <section className="flex flex-col gap-3 border-t border-line pt-5">
          <h3 className="text-sm font-medium">{t("upcoming")}</h3>
          {list?.key !== listKey ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : list.rows.length === 0 ? (
            <p className="text-sm text-muted">{t("none")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
              {list.rows.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-1.5 pr-1.5 pl-3.5">
                  <div className="min-w-0 text-sm">
                    <p className="tabular">{range(o)}</p>
                    {o.reason ? <p className="truncate text-muted">{o.reason}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    aria-label={tc("delete")}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await removeTimeOff(o.id);
                        if (res.ok) {
                          toast.success(t("removed"));
                          setVersion((v) => v + 1);
                        } else toast.error(tErr.has(res.error) ? tErr(res.error) : tc("error"));
                      })
                    }
                    className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                  >
                    <Trash size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}
