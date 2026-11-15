"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PencilSimple, Plus, Tag, Trash } from "@phosphor-icons/react";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Badge, LevelBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { BarberLevel, Service } from "@/db/schema";
import { deleteService, saveService } from "@/lib/dashboard/admin/actions/catalog";
import { cn, formatMDL, t9n } from "@/lib/utils";
import { ConfirmDialog } from "../dialogs";
import { LocaleTabs, type Lang } from "../locale-tabs";
import { Switch } from "../switch";
import { useAction } from "../use-action";

const CATEGORIES = ["hair", "beard", "combo", "extra"] as const;
const TIERS: Array<{ level: BarberLevel; key: "priceBarber" | "pricePro" | "priceTop" }> = [
  { level: "barber", key: "priceBarber" },
  { level: "pro", key: "pricePro" },
  { level: "top", key: "priceTop" },
];
const DURATIONS = Array.from({ length: 20 }, (_, i) => (i + 1) * 15);

type Draft = Pick<Service, "name" | "category" | "durationMin" | "active" | "sortOrder"> & {
  id: number | null;
  description: { ro: string; ru: string };
  priceBarber: string;
  pricePro: string;
  priceTop: string;
};

function toDraft(s: Service | null, nextSort: number): Draft {
  return {
    id: s?.id ?? null,
    name: s?.name ?? { ro: "", ru: "" },
    description: s?.description ?? { ro: "", ru: "" },
    category: s?.category ?? "hair",
    durationMin: s?.durationMin ?? 45,
    priceBarber: s?.priceBarber?.toString() ?? "",
    pricePro: s?.pricePro?.toString() ?? "",
    priceTop: s?.priceTop?.toString() ?? "",
    active: s?.active ?? true,
    sortOrder: s?.sortOrder ?? nextSort,
  };
}

/** Price matrix (services x tiers). Owners edit in a dialog; managers only read. */
export function ServicesManager({ services, canEdit, title }: { services: Service[]; canEdit: boolean; title: string }) {
  const t = useTranslations("dashAdmin.services");
  const tCat = useTranslations("common.categories");
  const tCommon = useTranslations("dashboard.common");
  const locale = useLocale();
  const [draft, setDraft] = useState<Draft | null>(null);
  const nextSort = services.reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1;
  const groups = CATEGORIES.map((c) => ({ category: c, items: services.filter((s) => s.category === c) })).filter((g) => g.items.length);
  const price = (v: number | null) => (v === null ? <span className="text-subtle">-</span> : formatMDL(v, locale));

  return (
    <>
      <PageHeader
        title={title}
        description={canEdit ? t("description", { count: services.length }) : t("readOnly")}
        actions={
          canEdit ? (
            <Button onClick={() => setDraft(toDraft(null, nextSort))} className="w-full sm:w-auto">
              <Plus size={18} />
              {t("add")}
            </Button>
          ) : null
        }
      />

      {services.length === 0 ? (
        <EmptyState icon={<Tag />} title={t("empty")} />
      ) : (
        <>
          {/* Desktop: the matrix */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("col.service")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.duration")}</th>
                  {TIERS.map((tier) => (
                    <th key={tier.level} className="px-4 py-3 text-right font-medium">
                      <LevelBadge level={tier.level} />
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">{t("col.status")}</th>
                  {canEdit ? <th className="w-14 px-2 py-3" aria-label={tCommon("edit")} /> : null}
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.category} className="divide-y divide-line border-b border-line last:border-b-0">
                  <tr className="bg-surface-2/60">
                    <th colSpan={canEdit ? 7 : 6} className="px-4 py-2 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                      {tCat(g.category)}
                    </th>
                  </tr>
                  {g.items.map((s) => (
                    <tr key={s.id} className={cn("transition-colors hover:bg-surface-2", !s.active && "opacity-55")}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{t9n(s.name, locale)}</p>
                        {s.description ? <p className="mt-0.5 line-clamp-1 max-w-md text-xs text-muted">{t9n(s.description, locale)}</p> : null}
                      </td>
                      <td className="tabular px-4 py-3 text-right whitespace-nowrap text-muted">{t("minutes", { count: s.durationMin })}</td>
                      {TIERS.map((tier) => (
                        <td key={tier.level} className="tabular px-4 py-3 text-right font-medium whitespace-nowrap">
                          {price(s[tier.key])}
                        </td>
                      ))}
                      <td className="px-4 py-3">{s.active ? <Badge tone="success">{tCommon("active")}</Badge> : <Badge>{tCommon("inactive")}</Badge>}</td>
                      {canEdit ? (
                        <td className="px-2 py-3">
                          <Button variant="ghost" size="icon" aria-label={tCommon("edit")} onClick={() => setDraft(toDraft(s, nextSort))}>
                            <PencilSimple size={18} />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>

          {/* Phones: one card per service */}
          <div className="flex flex-col gap-6 md:hidden">
            {groups.map((g) => (
              <section key={g.category}>
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{tCat(g.category)}</h2>
                <ul className="flex flex-col gap-2">
                  {g.items.map((s) => {
                    const body = (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">{t9n(s.name, locale)}</p>
                            <p className="tabular text-sm text-muted">{t("minutes", { count: s.durationMin })}</p>
                          </div>
                          {s.active ? null : <Badge>{tCommon("inactive")}</Badge>}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          {TIERS.map((tier) => (
                            <div key={tier.level} className="rounded-xl bg-surface-2 px-2.5 py-2">
                              <LevelBadge level={tier.level} className="h-5 px-2" />
                              <p className="tabular mt-1 text-sm font-medium">{price(s[tier.key])}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                    return (
                      <li key={s.id} className={cn(!s.active && "opacity-60")}>
                        {canEdit ? (
                          <button
                            type="button"
                            onClick={() => setDraft(toDraft(s, nextSort))}
                            className="w-full rounded-2xl border border-line bg-surface p-4 text-left active:bg-surface-2"
                          >
                            {body}
                          </button>
                        ) : (
                          <div className="rounded-2xl border border-line bg-surface p-4">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {canEdit && draft ? <ServiceDialog key={draft.id ?? "new"} draft={draft} onClose={() => setDraft(null)} /> : null}
    </>
  );
}

function ServiceDialog({ draft, onClose }: { draft: Draft; onClose: () => void }) {
  const t = useTranslations("dashAdmin.services");
  const tCat = useTranslations("common.categories");
  const tCommon = useTranslations("dashboard.common");
  const { run, pending, fieldError, hasErrorUnder } = useAction();
  const remove = useAction();
  const [form, setForm] = useState(draft);
  const [lang, setLang] = useState<Lang>("ro");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const patch = (next: Partial<Draft>) => setForm((f) => ({ ...f, ...next }));
  const toPrice = (v: string) => (v.trim() === "" ? null : Number(v));
  const id = draft.id;

  function submit() {
    run(
      () =>
        saveService({
          ...form,
          priceBarber: toPrice(form.priceBarber),
          pricePro: toPrice(form.pricePro),
          priceTop: toPrice(form.priceTop),
          sortOrder: Number(form.sortOrder) || 0,
        }),
      { success: tCommon("saved"), onSuccess: onClose },
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={draft.id ? t("editTitle") : t("newTitle")}
      footer={
        <>
          {draft.id ? (
            <Button variant="ghost" className="mr-auto text-danger" aria-label={tCommon("delete")} onClick={() => setConfirmDelete(true)} disabled={pending}>
              <Trash size={16} />
              <span className="hidden sm:inline" aria-hidden>
                {tCommon("delete")}
              </span>
            </Button>
          ) : null}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" form="service-form" disabled={pending}>
            {pending ? tCommon("loading") : tCommon("save")}
          </Button>
        </>
      }
    >
      <form
        id="service-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <LocaleTabs
          value={lang}
          onChange={setLang}
          errors={{ ro: hasErrorUnder("name.ro") || hasErrorUnder("description.ro"), ru: hasErrorUnder("name.ru") || hasErrorUnder("description.ru") }}
          className="self-start"
        />
        <Field label={t("name")} htmlFor="service-name" error={fieldError(`name.${lang}`)}>
          <Input
            id="service-name"
            key={`name-${lang}`}
            lang={lang}
            value={form.name[lang]}
            onChange={(e) => patch({ name: { ...form.name, [lang]: e.target.value } })}
            aria-invalid={!!fieldError(`name.${lang}`)}
          />
        </Field>
        <Field label={t("descriptionField")} htmlFor="service-description" error={fieldError(`description.${lang}`)}>
          <Textarea
            id="service-description"
            key={`desc-${lang}`}
            lang={lang}
            rows={3}
            className="min-h-20"
            value={form.description[lang]}
            onChange={(e) => patch({ description: { ...form.description, [lang]: e.target.value } })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("category")} htmlFor="service-category">
            <Select id="service-category" value={form.category} onChange={(e) => patch({ category: e.target.value as Draft["category"] })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {tCat(c)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("duration")} htmlFor="service-duration" error={fieldError("durationMin")}>
            <Select id="service-duration" value={form.durationMin} onChange={(e) => patch({ durationMin: Number(e.target.value) })} className="tabular">
              {(DURATIONS.includes(form.durationMin) ? DURATIONS : [...DURATIONS, form.durationMin].sort((a, b) => a - b)).map((d) => (
                <option key={d} value={d}>
                  {t("minutes", { count: d })}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("prices")}</legend>
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((tier) => (
              <label key={tier.level} className="flex flex-col gap-1.5">
                <LevelBadge level={tier.level} className="self-start" />
                <Input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form[tier.key]}
                  onChange={(e) => patch({ [tier.key]: e.target.value.replace(/\D/g, "") })}
                  placeholder="-"
                  className="tabular"
                  aria-invalid={!!fieldError(tier.key) || !!fieldError("prices")}
                  aria-label={t("priceFor", { level: tier.level.toUpperCase() })}
                />
              </label>
            ))}
          </div>
          <p className={cn("mt-2 text-sm", fieldError("prices") ? "text-danger" : "text-muted")}>{fieldError("prices") ?? t("pricesHint")}</p>
        </fieldset>
        <div className="grid grid-cols-[1fr_110px] items-end gap-3">
          <Switch checked={form.active} onChange={(active) => patch({ active })} label={t("active")} description={t("activeHint")} />
          <Field label={t("sortOrder")} htmlFor="service-sort">
            <Input
              id="service-sort"
              type="number"
              inputMode="numeric"
              min={0}
              value={form.sortOrder}
              onChange={(e) => patch({ sortOrder: Number(e.target.value) })}
              className="tabular"
            />
          </Field>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteTitle")}
        description={t("deleteText")}
        confirmLabel={tCommon("delete")}
        pending={remove.pending}
        onConfirm={() =>
          id &&
          remove.run(() => deleteService(id), {
            success: t("deleted"),
            onSuccess: () => {
              setConfirmDelete(false);
              onClose();
            },
          })
        }
      />
    </Dialog>
  );
}
