"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { updateClient } from "@/lib/dashboard/admin/actions/clients";
import type { Client } from "@/db/schema";
import { formatPhone } from "@/lib/utils";
import { useAction } from "../use-action";

export function ClientProfileForm({ client }: { client: Pick<Client, "id" | "name" | "phone" | "email" | "notes"> }) {
  const t = useTranslations("dashAdmin.clientDetail");
  const tCommon = useTranslations("dashboard.common");
  const { run, pending, fieldError } = useAction();
  const [form, setForm] = useState({
    name: client.name,
    phone: formatPhone(client.phone),
    email: client.email ?? "",
    notes: client.notes ?? "",
  });
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateClient({ id: client.id, ...form }), { success: tCommon("saved") });
      }}
    >
      <Field label={t("name")} htmlFor="client-name" error={fieldError("name")}>
        <Input id="client-name" value={form.name} onChange={set("name")} autoComplete="off" aria-invalid={!!fieldError("name")} />
      </Field>
      <Field label={t("phone")} htmlFor="client-phone" error={fieldError("phone")}>
        <Input
          id="client-phone"
          type="tel"
          inputMode="tel"
          value={form.phone}
          onChange={set("phone")}
          autoComplete="off"
          className="tabular"
          aria-invalid={!!fieldError("phone")}
        />
      </Field>
      <Field label={t("email")} htmlFor="client-email" error={fieldError("email")}>
        <Input
          id="client-email"
          type="email"
          inputMode="email"
          value={form.email}
          onChange={set("email")}
          autoComplete="off"
          aria-invalid={!!fieldError("email")}
        />
      </Field>
      <Field label={t("notes")} htmlFor="client-notes" hint={t("notesHint")} error={fieldError("notes")}>
        <Textarea id="client-notes" value={form.notes} onChange={set("notes")} rows={4} aria-invalid={!!fieldError("notes")} />
      </Field>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto sm:self-end">
        {pending ? tCommon("loading") : tCommon("save")}
      </Button>
    </form>
  );
}
