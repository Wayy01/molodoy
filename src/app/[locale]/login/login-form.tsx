"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const t = useTranslations("common.auth");
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <Field label={t("email")} htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={!!state?.error} />
      </Field>
      <Field label={t("password")} htmlFor="password" error={state?.error ? t("invalid") : undefined}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={!!state?.error} />
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {t("submit")}
      </Button>
    </form>
  );
}
