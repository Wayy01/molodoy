"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  ArrowCounterClockwise,
  CalendarDots,
  CaretRight,
  CheckCircle,
  NotePencil,
  Phone,
  UserMinus,
  XCircle,
} from "@phosphor-icons/react";
import { Link } from "@/i18n/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { LevelBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMDL, formatPhone, t9n } from "@/lib/utils";
import { dateKey, timeKey } from "@/lib/time";
import {
  getAppointmentExtras,
  rescheduleAppointment,
  setAppointmentStatus,
  updateAppointmentDetails,
} from "@/lib/dashboard/ops/actions";
import type { ActionResult, OpsAppointment } from "@/lib/dashboard/ops/types";
import type { BarberLevel } from "@/db/schema";
import { StatusBadge } from "./status-badge";
import { SlotPicker } from "./slot-picker";

type Extras = { visits: number; barbers: Array<{ id: number; name: string; level: BarberLevel; locationId: number }> };
type Mode = "view" | "edit" | "reschedule" | "cancel";

/** Shared by the calendar, the appointments list and the overview. Closes itself once the row leaves the parent's data. */
export function AppointmentDialog({ appointment, onClose }: { appointment: OpsAppointment; onClose: () => void }) {
  const t = useTranslations("dashOps.details");
  const tc = useTranslations("dashboard.common");
  const tSource = useTranslations("common.source");
  const tMin = useTranslations("common.time");
  const locale = useLocale();
  const format = useFormatter();
  const a = appointment;

  const [extras, setExtras] = useState<Extras | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    getAppointmentExtras(a.id).then((r) => live && setExtras(r));
    return () => {
      live = false;
    };
  }, [a.id]);

  const run = (action: () => Promise<ActionResult>, success: string, after?: () => void) =>
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(success);
        after?.();
      } else toast.error(errorMessage(res.error));
    });

  const tErr = useTranslations("dashOps.errors");
  const errorMessage = (e: string) => (tErr.has(e) ? tErr(e) : tc("error"));

  const canMark = dateKey(a.startsAt) <= dateKey();
  const when = `${format.dateTime(a.startsAt, { weekday: "long", day: "numeric", month: "long" })}, ${timeKey(a.startsAt)}-${timeKey(a.endsAt)}`;

  return (
    <Dialog open onClose={onClose} title={t("title")} className="sm:max-w-xl">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-xl font-semibold tracking-tight">{a.client.name}</p>
            <div className="mt-1 text-sm text-muted">
              {extras ? t("visits", { count: extras.visits }) : <Skeleton className="h-4 w-24" />}
            </div>
          </div>
          <StatusBadge status={a.status} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${a.client.phone}`}
            className="flex h-11 items-center justify-center gap-2 rounded-full border border-line-strong text-sm font-medium hover:bg-surface-2"
          >
            <Phone size={17} />
            <span className="tabular truncate">{formatPhone(a.client.phone)}</span>
          </a>
          <Link
            href={`/dashboard/clients/${a.client.id}`}
            className="flex h-11 items-center justify-center gap-1.5 rounded-full border border-line-strong text-sm font-medium hover:bg-surface-2"
          >
            {t("clientProfile")}
            <CaretRight size={14} />
          </Link>
        </div>

        <dl className="divide-y divide-line rounded-2xl border border-line">
          <Row label={t("service")}>
            {t9n(a.service.name, locale)}
            <span className="text-muted"> · {tMin("min", { count: Math.round((+a.endsAt - +a.startsAt) / 60_000) })}</span>
          </Row>
          <Row label={t("barber")}>
            <span className="inline-flex items-center gap-2">
              <Avatar src={a.barber.photo} name={a.barber.name} size={24} />
              {a.barber.name}
              <LevelBadge level={a.barber.level} />
            </span>
          </Row>
          <Row label={t("branch")}>{t9n(a.location.name, locale)}</Row>
          <Row label={t("when")}>
            <span className="first-letter:uppercase">{when}</span>
          </Row>
          <Row label={t("price")}>
            <span className="tabular font-medium">{formatMDL(a.price, locale)}</span>
          </Row>
          <Row label={t("source")}>{tSource(a.source)}</Row>
          <Row label={t("code")}>
            <span className="font-mono text-[13px] tracking-wider">{a.code}</span>
          </Row>
          {a.note ? (
            <Row label={t("note")}>
              <span className="whitespace-pre-line">{a.note}</span>
            </Row>
          ) : null}
        </dl>

        {mode === "view" ? (
          <div className="grid grid-cols-2 gap-2">
            {a.status === "booked" ? (
              <>
                {canMark ? (
                  <>
                    <Button
                      variant="primary"
                      disabled={pending}
                      onClick={() => run(() => setAppointmentStatus(a.id, "completed"), t("doneCompleted"))}
                    >
                      <CheckCircle size={18} weight="bold" />
                      {t("markCompleted")}
                    </Button>
                    <Button variant="secondary" disabled={pending} onClick={() => run(() => setAppointmentStatus(a.id, "no_show"), t("doneNoShow"))}>
                      <UserMinus size={18} />
                      {t("markNoShow")}
                    </Button>
                  </>
                ) : null}
                <Button variant="secondary" disabled={pending} onClick={() => setMode("reschedule")}>
                  <CalendarDots size={18} />
                  {t("reschedule")}
                </Button>
                <Button variant="secondary" disabled={pending} onClick={() => setMode("edit")}>
                  <NotePencil size={18} />
                  {t("edit")}
                </Button>
                <Button variant="danger" disabled={pending} onClick={() => setMode("cancel")} className="col-span-2">
                  <XCircle size={18} />
                  {t("cancel")}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => setAppointmentStatus(a.id, "booked"), t("doneRestored"))}
                >
                  <ArrowCounterClockwise size={18} />
                  {a.status === "cancelled" ? t("restore") : t("undo")}
                </Button>
                <Button variant="secondary" disabled={pending} onClick={() => setMode("edit")}>
                  <NotePencil size={18} />
                  {t("edit")}
                </Button>
              </>
            )}
          </div>
        ) : null}

        {mode === "cancel" ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-danger/25 bg-danger/8 p-4">
            <p className="text-sm">{t("cancelConfirm")}</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" disabled={pending} onClick={() => setMode("view")}>
                {tc("previous")}
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => run(() => setAppointmentStatus(a.id, "cancelled"), t("doneCancelled"), () => setMode("view"))}
              >
                {t("cancelYes")}
              </Button>
            </div>
          </div>
        ) : null}

        {mode === "edit" ? <EditForm appointment={a} onDone={() => setMode("view")} /> : null}

        {mode === "reschedule" ? (
          extras ? (
            <RescheduleForm appointment={a} barbers={extras.barbers} onDone={() => setMode("view")} />
          ) : (
            <Skeleton className="h-40 w-full rounded-2xl" />
          )
        ) : null}
      </div>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

function EditForm({ appointment, onDone }: { appointment: OpsAppointment; onDone: () => void }) {
  const t = useTranslations("dashOps.details");
  const tc = useTranslations("dashboard.common");
  const [price, setPrice] = useState(String(appointment.price));
  const [note, setNote] = useState(appointment.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateAppointmentDetails({ id: appointment.id, price, note });
          if (res.ok) {
            toast.success(tc("saved"));
            onDone();
          } else {
            setErrors(res.fields ?? {});
            if (!res.fields) toast.error(tc("error"));
          }
        });
      }}
    >
      <Field label={t("price")} htmlFor="appt-price" error={errors.price ? t("priceInvalid") : undefined}>
        <Input
          id="appt-price"
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
          aria-invalid={!!errors.price}
          className="tabular"
        />
      </Field>
      <Field label={t("note")} htmlFor="appt-note">
        <Textarea id="appt-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tc("loading") : tc("save")}
        </Button>
      </div>
    </form>
  );
}

function RescheduleForm({
  appointment,
  barbers,
  onDone,
}: {
  appointment: OpsAppointment;
  barbers: Extras["barbers"];
  onDone: () => void;
}) {
  const t = useTranslations("dashOps.details");
  const tc = useTranslations("dashboard.common");
  const tErr = useTranslations("dashOps.errors");
  const [barberId, setBarberId] = useState(appointment.barber.id);
  const [date, setDate] = useState(dateKey(appointment.startsAt) < dateKey() ? dateKey() : dateKey(appointment.startsAt));
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!time) return setError(tErr("pickTime"));
        start(async () => {
          const res = await rescheduleAppointment({ id: appointment.id, barberId, date, time });
          if (res.ok) {
            toast.success(t("doneRescheduled"));
            onDone();
          } else {
            setError(tErr.has(res.error) ? tErr(res.error) : tc("error"));
            if (res.error === "slotTaken") setTime(null);
          }
        });
      }}
    >
      {barbers.length > 1 ? (
        <Field label={t("barber")} htmlFor="resched-barber">
          <Select id="resched-barber" value={barberId} onChange={(e) => setBarberId(Number(e.target.value))}>
            {barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.level.toUpperCase()}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Field label={t("date")} htmlFor="resched-date">
        <Input id="resched-date" type="date" min={dateKey()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </Field>
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("time")}</span>
        <SlotPicker
          barberId={barberId}
          serviceId={appointment.service.id}
          date={date}
          excludeAppointmentId={appointment.id}
          value={time}
          onChange={(v) => {
            setTime(v);
            setError(null);
          }}
          invalid={!!error}
        />
        {error ? (
          <p role="alert" className={cn("text-sm text-danger")}>
            {error}
          </p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onDone} disabled={pending}>
          {tc("cancel")}
        </Button>
        <Button type="submit" disabled={pending || !time}>
          {pending ? tc("loading") : t("saveReschedule")}
        </Button>
      </div>
    </form>
  );
}
