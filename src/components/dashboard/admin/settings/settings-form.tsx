"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import type { SiteSettings } from "@/db/schema";
import { saveSettings } from "@/lib/dashboard/admin/actions/settings";
import { cn, formatPhone } from "@/lib/utils";
import { Card } from "../layout-bits";
import { useAction } from "../use-action";

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const t = useTranslations("dashAdmin.settings");
  const tCommon = useTranslations("dashboard.common");
  const { run, pending, fieldError } = useAction();
  const [form, setForm] = useState({
    ...settings,
    phone: formatPhone(settings.phone),
    bookingHorizonDays: String(settings.bookingHorizonDays),
    firstVisitDiscount: String(settings.firstVisitDiscount),
  });
  const patch = (next: Partial<typeof form>) => setForm((f) => ({ ...f, ...next }));
  const text = (key: "phone" | "email" | "instagram" | "tiktok" | "facebook", type: string, inputMode: "tel" | "email" | "url", placeholder?: string) => (
    <Field label={t(key)} htmlFor={`settings-${key}`} error={fieldError(key)}>
      <Input
        id={`settings-${key}`}
        type={type}
        inputMode={inputMode}
        value={form[key]}
        onChange={(e) => patch({ [key]: e.target.value })}
        placeholder={placeholder}
        autoCapitalize="none"
        spellCheck={false}
        className={key === "phone" ? "tabular" : undefined}
        aria-invalid={!!fieldError(key)}
      />
    </Field>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveSettings({
              ...form,
              bookingHorizonDays: Number(form.bookingHorizonDays),
              firstVisitDiscount: Number(form.firstVisitDiscount || 0),
            }),
          { success: tCommon("saved") },
        );
      }}
    >
      <Card title={t("title")} description={t("description")}>
        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          <h3 className="text-xs font-semibold tracking-wide text-muted uppercase md:col-span-2">{t("contacts")}</h3>
          {text("phone", "tel", "tel")}
          {text("email", "email", "email", "salut@molodoy.md")}
          {text("instagram", "url", "url", "https://www.instagram.com/molodoy")}
          {text("tiktok", "url", "url", "https://www.tiktok.com/@molodoy")}
          {text("facebook", "url", "url", "https://www.facebook.com/molodoy")}

          <h3 className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase md:col-span-2">{t("booking")}</h3>
          <Field label={t("bookingHorizonDays")} htmlFor="settings-horizon" hint={t("bookingHorizonHint")} error={fieldError("bookingHorizonDays")}>
            <Input
              id="settings-horizon"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              value={form.bookingHorizonDays}
              onChange={(e) => patch({ bookingHorizonDays: e.target.value })}
              className="tabular"
              aria-invalid={!!fieldError("bookingHorizonDays")}
            />
          </Field>
          <Field label={t("firstVisitDiscount")} htmlFor="settings-discount" hint={t("firstVisitDiscountHint")} error={fieldError("firstVisitDiscount")}>
            <div className="relative">
              <Input
                id="settings-discount"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.firstVisitDiscount}
                onChange={(e) => patch({ firstVisitDiscount: e.target.value.replace(/\D/g, "") })}
                className="tabular pr-16"
                aria-invalid={!!fieldError("firstVisitDiscount")}
              />
              <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted">MDL</span>
            </div>
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t("slotStepMin")}</legend>
            <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1" role="radiogroup">
              {[15, 30].map((step) => (
                <button
                  key={step}
                  type="button"
                  role="radio"
                  aria-checked={form.slotStepMin === step}
                  onClick={() => patch({ slotStepMin: step })}
                  className={cn(
                    "tabular h-10 rounded-full text-sm font-medium transition-colors",
                    form.slotStepMin === step ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                  )}
                >
                  {t("minutes", { count: step })}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted">{t("slotStepHint")}</p>
          </fieldset>
        </div>
        <div className="mt-6 flex justify-end border-t border-line pt-4">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            {pending ? tCommon("loading") : tCommon("save")}
          </Button>
        </div>
      </Card>
    </form>
  );
}
