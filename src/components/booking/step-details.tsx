"use client";

import { useTranslations } from "next-intl";
import { Gift } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

export type DetailsValues = { name: string; phone: string; email: string; note: string; website: string };
export type DetailsField = "name" | "phone" | "email";
export const DETAILS_FORM_ID = "booking-details";

export function StepDetails({
  discount,
  pending,
  errors,
  onSubmit,
}: {
  discount: number;
  pending: boolean;
  errors: DetailsField[];
  onSubmit: (values: DetailsValues) => void;
}) {
  const t = useTranslations("booking");

  return (
    <form
      id={DETAILS_FORM_ID}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        onSubmit(Object.fromEntries(["name", "phone", "email", "note", "website"].map((k) => [k, String(form.get(k) ?? "")])) as DetailsValues);
      }}
    >
      <Field label={t("details.name")} htmlFor="b-name" error={errors.includes("name") ? t("errors.name") : undefined}>
        <Input id="b-name" name="name" autoComplete="name" required minLength={2} maxLength={60} aria-invalid={errors.includes("name")} />
      </Field>
      <Field label={t("details.phone")} htmlFor="b-phone" hint={t("details.phoneHint")} error={errors.includes("phone") ? t("errors.phone") : undefined}>
        <Input id="b-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="069 123 456" required aria-invalid={errors.includes("phone")} />
      </Field>
      <Field label={t("details.email")} htmlFor="b-email" error={errors.includes("email") ? t("errors.email") : undefined}>
        <Input id="b-email" name="email" type="email" autoComplete="email" aria-invalid={errors.includes("email")} />
      </Field>
      <Field label={t("details.note")} htmlFor="b-note">
        <Textarea id="b-note" name="note" maxLength={300} placeholder={t("details.notePlaceholder")} className="min-h-24" />
      </Field>
      {/* Honeypot for bots; hidden from people and screen readers. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />

      {discount > 0 && (
        <p className="flex items-start gap-3 rounded-2xl border border-accent/25 bg-accent-soft p-4 text-sm">
          <Gift size={20} className="shrink-0 text-accent" />
          {t("details.firstVisit", { amount: discount })}
        </p>
      )}
      <p className="text-xs leading-relaxed text-subtle">{t("details.consent")}</p>

      <Button type="submit" size="lg" disabled={pending} className="hidden w-full lg:inline-flex">
        {pending ? t("details.submitting") : t("details.submit")}
      </Button>
    </form>
  );
}
