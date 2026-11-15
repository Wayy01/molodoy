"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { ArrowsClockwise, Key, Power } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { createBarberLogin } from "@/lib/dashboard/admin/actions/team";
import { resetPassword, setUserActive } from "@/lib/dashboard/admin/actions/staff";
import { ConfirmDialog, CredentialsDialog } from "../dialogs";
import { Card } from "../layout-bits";
import { useAction } from "../use-action";

type Login = { id: number; email: string; active: boolean; lastLoginAt: Date | null };

/** The barber's own dashboard account: create, reset password, switch off. */
export function StaffLoginCard({ barberId, login }: { barberId: number; login: Login | null }) {
  const t = useTranslations("dashAdmin.staffLogin");
  const tCommon = useTranslations("dashboard.common");
  const format = useFormatter();
  const { run, pending, fieldError } = useAction();
  const [email, setEmail] = useState("");
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const [confirm, setConfirm] = useState<"reset" | "deactivate" | null>(null);

  return (
    <Card title={t("title")} description={login ? undefined : t("noLogin")}>
      {login ? (
        <div className="flex flex-col gap-4">
          <dl className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("email")}</dt>
              <dd className="min-w-0 truncate font-medium">{login.email}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("status")}</dt>
              <dd>{login.active ? <Badge tone="success">{tCommon("active")}</Badge> : <Badge tone="warning">{tCommon("inactive")}</Badge>}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted">{t("lastLogin")}</dt>
              <dd className="tabular">
                {login.lastLoginAt ? format.dateTime(login.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) : t("never")}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConfirm("reset")} disabled={pending} className="h-11 sm:h-9">
              <ArrowsClockwise size={16} />
              {t("reset")}
            </Button>
            {login.active ? (
              <Button variant="danger" size="sm" onClick={() => setConfirm("deactivate")} disabled={pending} className="h-11 sm:h-9">
                <Power size={16} />
                {t("deactivate")}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={pending}
                className="h-11 sm:h-9"
                onClick={() => run(() => setUserActive(login.id, true), { success: t("activated") })}
              >
                <Power size={16} />
                {t("activate")}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createBarberLogin({ barberId, email }), { onSuccess: setCredentials });
          }}
        >
          <Field label={t("email")} htmlFor="login-email" error={fieldError("email")}>
            <Input
              id="login-email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldError("email")}
              required
            />
          </Field>
          <Button type="submit" variant="secondary" disabled={pending || !email} className="self-start">
            <Key size={16} />
            {t("create")}
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        tone="primary"
        title={t("resetTitle")}
        description={t("resetText")}
        confirmLabel={t("reset")}
        pending={pending}
        onConfirm={() =>
          login &&
          run(() => resetPassword(login.id), {
            onSuccess: (data) => {
              setConfirm(null);
              setCredentials(data);
            },
          })
        }
      />
      <ConfirmDialog
        open={confirm === "deactivate"}
        onClose={() => setConfirm(null)}
        title={t("deactivateTitle")}
        description={t("deactivateText")}
        confirmLabel={t("deactivate")}
        pending={pending}
        onConfirm={() => login && run(() => setUserActive(login.id, false), { success: t("deactivated"), onSuccess: () => setConfirm(null) })}
      />
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}
