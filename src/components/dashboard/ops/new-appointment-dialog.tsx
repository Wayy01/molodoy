"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { MagnifyingGlass, UserPlus, X } from "@phosphor-icons/react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatMDL, formatPhone, priceFor, t9n } from "@/lib/utils";
import { dateKey } from "@/lib/time";
import { createAppointment, searchClients } from "@/lib/dashboard/ops/actions";
import type { ClientHit, OpsBarber, OpsService } from "@/lib/dashboard/ops/types";
import { SlotPicker } from "./slot-picker";

export type NewAppointmentPrefill = { barberId?: number | null; date: string; time?: string | null };

export function NewAppointmentDialog({
  barbers,
  services,
  prefill,
  onClose,
}: {
  barbers: OpsBarber[];
  services: OpsService[];
  prefill: NewAppointmentPrefill;
  onClose: () => void;
}) {
  const t = useTranslations("dashOps.create");
  const tc = useTranslations("dashboard.common");
  const tErr = useTranslations("dashOps.errors");
  const tSource = useTranslations("common.source");
  const locale = useLocale();

  const offered = (barber: OpsBarber | undefined) => (barber ? services.filter((s) => priceFor(s, barber.level) != null) : []);
  const initialBarber = barbers.find((b) => b.id === prefill.barberId) ?? barbers[0];
  const initialService = offered(initialBarber)[0];

  const [barberId, setBarberId] = useState<number | null>(initialBarber?.id ?? null);
  const [serviceId, setServiceId] = useState<number | null>(initialService?.id ?? null);
  const [date, setDate] = useState(prefill.date < dateKey() ? dateKey() : prefill.date);
  const [time, setTime] = useState<string | null>(prefill.time ?? null);
  const [price, setPrice] = useState(initialService && initialBarber ? String(priceFor(initialService, initialBarber.level)) : "");
  const [source, setSource] = useState<"phone" | "walk_in">("phone");
  const [note, setNote] = useState("");
  const [client, setClient] = useState<ClientHit | null>(null);
  const [mode, setMode] = useState<"search" | "new">("search");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const barber = barbers.find((b) => b.id === barberId);
  const serviceList = useMemo(() => (barber ? services.filter((s) => priceFor(s, barber.level) != null) : []), [barber, services]);

  const pickBarber = (id: number) => {
    const next = barbers.find((b) => b.id === id);
    setBarberId(id);
    const keep = serviceList.find((s) => s.id === serviceId);
    const svc = next && keep && priceFor(keep, next.level) != null ? keep : offered(next)[0];
    setServiceId(svc?.id ?? null);
    if (svc && next) setPrice(String(priceFor(svc, next.level)));
  };

  const pickService = (id: number) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc && barber) setPrice(String(priceFor(svc, barber.level)));
  };

  const clear = (key: string) => setErrors((e) => (e[key] ? { ...e, [key]: "" } : e));

  const message = (key: string) => {
    const code = errors[key];
    if (!code) return undefined;
    if (code === "slotTaken") return tErr("slotTaken");
    if (code === "phone") return tErr("phone");
    return tErr("required");
  };

  const submit = () => {
    const local: Record<string, string> = {};
    if (!barberId) local.barberId = "required";
    if (!serviceId) local.serviceId = "required";
    if (!time) local.time = "required";
    if (mode === "search" && !client) local.clientId = "required";
    if (mode === "new") {
      if (newName.trim().length < 2) local.clientName = "required";
      const digits = newPhone.replace(/\D/g, "");
      if (digits.length < 8 || digits.length > 12) local.clientPhone = "phone";
    }
    if (price === "") local.price = "required";
    setErrors(local);
    if (Object.keys(local).length) return;

    start(async () => {
      const res = await createAppointment({
        barberId: barberId!,
        serviceId: serviceId!,
        date,
        time: time!,
        clientId: mode === "search" ? client!.id : undefined,
        clientName: mode === "new" ? newName : undefined,
        clientPhone: mode === "new" ? newPhone : undefined,
        source,
        note,
        price,
      });
      if (res.ok) {
        toast.success(t("created"));
        onClose();
        return;
      }
      if (res.fields) setErrors(res.fields);
      if (res.error === "slotTaken") setTime(null);
      if (!res.fields || res.error === "slotTaken") toast.error(tErr.has(res.error) ? tErr(res.error) : tc("error"));
    });
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("title")}
      className="sm:max-w-xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="new-appointment" disabled={pending}>
            {pending ? tc("loading") : t("submit")}
          </Button>
        </>
      }
    >
      <form
        id="new-appointment"
        noValidate
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {barbers.length > 1 ? (
          <Field label={t("barber")} htmlFor="na-barber" error={message("barberId")}>
            <Select id="na-barber" value={barberId ?? ""} onChange={(e) => pickBarber(Number(e.target.value))}>
              {barbers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {b.level.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">{t("service")}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {serviceList.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={s.id === serviceId}
                onClick={() => pickService(s.id)}
                className={cn(
                  "flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors",
                  s.id === serviceId ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{t9n(s.name, locale)}</span>
                  <span className="text-xs text-muted">{t("minutes", { count: s.durationMin })}</span>
                </span>
                <span className="tabular shrink-0 text-muted">{barber ? formatMDL(priceFor(s, barber.level)!, locale) : null}</span>
              </button>
            ))}
          </div>
          {message("serviceId") ? (
            <p role="alert" className="text-sm text-danger">
              {message("serviceId")}
            </p>
          ) : null}
        </fieldset>

        <Field label={t("date")} htmlFor="na-date">
          <Input
            id="na-date"
            type="date"
            min={dateKey()}
            value={date}
            onChange={(e) => {
              if (e.target.value) setDate(e.target.value);
              clear("time");
            }}
          />
        </Field>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{t("time")}</span>
          <SlotPicker
            barberId={barberId}
            serviceId={serviceId}
            date={date}
            value={time}
            onChange={(v) => {
              setTime(v);
              clear("time");
            }}
            invalid={!!errors.time}
          />
          {message("time") ? (
            <p role="alert" className="text-sm text-danger">
              {message("time")}
            </p>
          ) : null}
        </div>

        <ClientPicker
          mode={mode}
          onMode={(m, seed) => {
            setMode(m);
            setClient(null);
            if (seed) setNewPhone(seed);
            setErrors((e) => ({ ...e, clientId: "", clientName: "", clientPhone: "" }));
          }}
          client={client}
          onClient={(c) => {
            setClient(c);
            clear("clientId");
          }}
          name={newName}
          phone={newPhone}
          onName={(v) => {
            setNewName(v);
            clear("clientName");
          }}
          onPhone={(v) => {
            setNewPhone(v);
            clear("clientPhone");
          }}
          errors={{ clientId: message("clientId"), clientName: message("clientName"), clientPhone: message("clientPhone") }}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{t("source")}</legend>
            <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1">
              {(["phone", "walk_in"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={source === s}
                  onClick={() => setSource(s)}
                  className={cn(
                    "h-10 truncate rounded-full px-2 text-sm font-medium transition-colors",
                    source === s ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {tSource(s)}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label={t("price")} htmlFor="na-price" error={message("price")} hint={t("priceHint")}>
            <div className="relative">
              <Input
                id="na-price"
                inputMode="numeric"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value.replace(/\D/g, ""));
                  clear("price");
                }}
                aria-invalid={!!errors.price}
                className="tabular pr-14"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted">MDL</span>
            </div>
          </Field>
        </div>

        <Field label={t("note")} htmlFor="na-note">
          <Textarea id="na-note" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} className="min-h-20" />
        </Field>
      </form>
    </Dialog>
  );
}

function ClientPicker({
  mode,
  onMode,
  client,
  onClient,
  name,
  phone,
  onName,
  onPhone,
  errors,
}: {
  mode: "search" | "new";
  onMode: (mode: "search" | "new", seedPhone?: string) => void;
  client: ClientHit | null;
  onClient: (c: ClientHit | null) => void;
  name: string;
  phone: string;
  onName: (v: string) => void;
  onPhone: (v: string) => void;
  errors: { clientId?: string; clientName?: string; clientPhone?: string };
}) {
  const t = useTranslations("dashOps.create");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ q: string; hits: ClientHit[] } | null>(null);
  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    let live = true;
    const id = setTimeout(() => {
      searchClients(q).then((hits) => live && setResults({ q, hits }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [q]);

  if (mode === "new") {
    return (
      <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-medium">{t("newClient")}</legend>
          <button type="button" onClick={() => onMode("search")} className="text-sm text-accent hover:underline">
            {t("searchExisting")}
          </button>
        </div>
        <Field label={t("clientName")} htmlFor="na-name" error={errors.clientName}>
          <Input id="na-name" value={name} autoComplete="off" onChange={(e) => onName(e.target.value)} aria-invalid={!!errors.clientName} />
        </Field>
        <Field label={t("clientPhone")} htmlFor="na-phone" error={errors.clientPhone} hint={t("phoneHint")}>
          <Input
            id="na-phone"
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="069 123 456"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            aria-invalid={!!errors.clientPhone}
            className="tabular"
          />
        </Field>
      </fieldset>
    );
  }

  if (client) {
    return (
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{t("client")}</span>
        <div className="flex items-center justify-between gap-3 rounded-xl border border-accent bg-accent-soft px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate font-medium">{client.name}</p>
            <p className="tabular text-sm text-muted">
              {formatPhone(client.phone)} · {t("visits", { count: client.visits })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onClient(null)}
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-fg"
            aria-label={t("changeClient")}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  const loading = q.length >= 2 && results?.q !== q;
  const hits = q.length >= 2 && results?.q === q ? results.hits : [];
  const looksLikePhone = q.replace(/\D/g, "").length >= 6;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="na-client" className="text-sm font-medium">
          {t("client")}
        </label>
        <button type="button" onClick={() => onMode("new")} className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
          <UserPlus size={16} />
          {t("newClient")}
        </button>
      </div>
      <div className="relative">
        <MagnifyingGlass size={18} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle" />
        <Input
          id="na-client"
          type="search"
          autoComplete="off"
          placeholder={t("searchPlaceholder")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-invalid={!!errors.clientId}
          className="pl-10"
        />
      </div>
      {loading ? (
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : hits.length ? (
        <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-xl border border-line">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => onClient(h)} className="flex min-h-12 w-full items-center justify-between gap-3 px-3.5 py-2 text-left hover:bg-surface-2">
                <span className="min-w-0 truncate font-medium">{h.name}</span>
                <span className="tabular shrink-0 text-sm text-muted">{formatPhone(h.phone)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : q.length >= 2 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-sm text-muted">
          {t("noClients")}
          <button type="button" onClick={() => onMode("new", looksLikePhone ? q : undefined)} className="font-medium text-accent hover:underline">
            {t("createClient")}
          </button>
        </div>
      ) : null}
      {errors.clientId ? (
        <p role="alert" className="text-sm text-danger">
          {errors.clientId}
        </p>
      ) : null}
    </div>
  );
}
