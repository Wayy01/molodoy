"use client";

import { useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { ArrowsClockwise, Power, UserPlus } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import type { Localized } from "@/db/schema";
import { createStaff, resetPassword, setUserActive } from "@/lib/dashboard/admin/actions/staff";
import type { StaffRow } from "@/lib/dashboard/admin/staff";
import { cn, t9n } from "@/lib/utils";
import { ConfirmDialog, CredentialsDialog } from "../dialogs";
import { Card } from "../layout-bits";
import { useAction } from "../use-action";

type Credentials = { email: string; password: string };

export function StaffAccounts({
  staff,
  locations,
  currentUserId,
}: {
  staff: StaffRow[];
  locations: Array<{ id: number; name: Localized }>;
  currentUserId: number;
}) {
  const t = useTranslations("dashAdmin.staff");
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);

  return (
    <Card
      title={t("title")}
      description={t("description")}
      actions={
        <Button variant="secondary" onClick={() => setCreating(true)} className="w-full sm:w-auto">
          <UserPlus size={18} />
          {t("add")}
        </Button>
      }
    >
      <ul className="-mx-4 divide-y divide-line border-t border-line sm:-mx-6">
        {staff.map((u) => (
          <StaffRowItem key={u.id} user={u} self={u.id === currentUserId} onCredentials={setCredentials} />
        ))}
      </ul>
      {creating ? (
        <CreateStaffDialog
          locations={locations}
          onClose={() => setCreating(false)}
          onCreated={(c) => {
            setCreating(false);
            setCredentials(c);
          }}
        />
      ) : null}
      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}

function StaffRowItem({ user, self, onCredentials }: { user: StaffRow; self: boolean; onCredentials: (c: Credentials) => void }) {
  const t = useTranslations("dashAdmin.staff");
  const tRoles = useTranslations("dashboard.roles");
  const tCommon = useTranslations("dashboard.common");
  const format = useFormatter();
  const locale = useLocale();
  const { run, pending } = useAction();
  const [confirm, setConfirm] = useState<"reset" | "deactivate" | null>(null);
  const place = user.barberName && user.barberName !== user.name ? `${user.barberName}, ` : "";

  return (
    <li className={cn("flex flex-col gap-3 px-4 py-4 sm:px-6 md:flex-row md:items-center", !user.active && "opacity-60")}>
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={user.name} size={40} />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{user.name}</span>
            <Badge tone={user.role === "owner" ? "accent" : "neutral"}>{tRoles(user.role)}</Badge>
            {self ? <Badge tone="info">{t("you")}</Badge> : null}
            {user.active ? null : <Badge tone="warning">{tCommon("inactive")}</Badge>}
          </p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <p className="mt-0.5 text-xs text-subtle">
            {place}
            {user.locationName ? t9n(user.locationName, locale) : t("allBranches")}
            {", "}
            {user.lastLoginAt ? t("lastLogin", { date: format.dateTime(user.lastLoginAt, { dateStyle: "medium", timeStyle: "short" }) }) : t("neverLoggedIn")}
          </p>
        </div>
      </div>
      <div className="flex gap-2 md:shrink-0">
        <Button variant="secondary" size="sm" className="h-11 flex-1 md:h-9 md:flex-none" disabled={pending} onClick={() => setConfirm("reset")}>
          <ArrowsClockwise size={16} />
          {t("reset")}
        </Button>
        {user.active ? (
          <Button
            variant="danger"
            size="sm"
            className="h-11 flex-1 md:h-9 md:flex-none"
            disabled={pending || self}
            title={self ? t("cannotDeactivateSelf") : undefined}
            onClick={() => setConfirm("deactivate")}
          >
            <Power size={16} />
            {t("deactivate")}
          </Button>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            className="h-11 flex-1 md:h-9 md:flex-none"
            disabled={pending}
            onClick={() => run(() => setUserActive(user.id, true), { success: t("activated") })}
          >
            <Power size={16} />
            {t("activate")}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirm === "reset"}
        onClose={() => setConfirm(null)}
        tone="primary"
        title={t("resetTitle", { name: user.name })}
        description={t("resetText")}
        confirmLabel={t("reset")}
        pending={pending}
        onConfirm={() =>
          run(() => resetPassword(user.id), {
            onSuccess: (c) => {
              setConfirm(null);
              onCredentials(c);
            },
          })
        }
      />
      <ConfirmDialog
        open={confirm === "deactivate"}
        onClose={() => setConfirm(null)}
        title={t("deactivateTitle", { name: user.name })}
        description={t("deactivateText")}
        confirmLabel={t("deactivate")}
        pending={pending}
        onConfirm={() => run(() => setUserActive(user.id, false), { success: t("deactivated"), onSuccess: () => setConfirm(null) })}
      />
    </li>
  );
}

function CreateStaffDialog({
  locations,
  onClose,
  onCreated,
}: {
  locations: Array<{ id: number; name: Localized }>;
  onClose: () => void;
  onCreated: (c: Credentials) => void;
}) {
  const t = useTranslations("dashAdmin.staff");
  const tRoles = useTranslations("dashboard.roles");
  const tCommon = useTranslations("dashboard.common");
  const locale = useLocale();
  const { run, pending, fieldError } = useAction();
  const [form, setForm] = useState({ name: "", email: "", role: "manager" as "manager" | "owner", locationId: locations[0]?.id ?? null });
  const patch = (next: Partial<typeof form>) => setForm((f) => ({ ...f, ...next }));

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("addTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button type="submit" form="staff-form" disabled={pending}>
            {pending ? tCommon("loading") : tCommon("create")}
          </Button>
        </>
      }
    >
      <form
        id="staff-form"
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => createStaff({ ...form, locationId: form.role === "manager" ? form.locationId : null }), { success: t("created"), onSuccess: onCreated });
        }}
      >
        <Field label={t("name")} htmlFor="staff-name" error={fieldError("name")}>
          <Input id="staff-name" value={form.name} onChange={(e) => patch({ name: e.target.value })} autoComplete="off" aria-invalid={!!fieldError("name")} />
        </Field>
        <Field label={t("email")} htmlFor="staff-email" error={fieldError("email")}>
          <Input
            id="staff-email"
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="off"
            value={form.email}
            onChange={(e) => patch({ email: e.target.value })}
            aria-invalid={!!fieldError("email")}
          />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">{t("role")}</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup">
            {(["manager", "owner"] as const).map((role) => (
              <button
                key={role}
                type="button"
                role="radio"
                aria-checked={form.role === role}
                onClick={() => patch({ role })}
                className={cn(
                  "flex min-h-14 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left transition-colors",
                  form.role === role ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2",
                )}
              >
                <span className="text-sm font-medium">{tRoles(role)}</span>
                <span className="text-xs text-muted">{t(`roleHint.${role}`)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {form.role === "manager" ? (
          <Field label={t("branch")} htmlFor="staff-branch" error={fieldError("locationId")}>
            <Select id="staff-branch" value={form.locationId ?? ""} onChange={(e) => patch({ locationId: Number(e.target.value) })}>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {t9n(l.name, locale)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <p className="text-sm text-muted">{t("passwordNote")}</p>
      </form>
    </Dialog>
  );
}
