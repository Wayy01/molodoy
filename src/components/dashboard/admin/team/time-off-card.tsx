"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { TimeOff } from "@/db/schema";
import { deleteTimeOff } from "@/lib/dashboard/admin/actions/team";
import { dateKey } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "../dialogs";
import { Card } from "../layout-bits";
import { useAction } from "../use-action";

type Absence = TimeOff & { past: boolean };

export function TimeOffCard({ absences }: { absences: Absence[] }) {
  const t = useTranslations("dashAdmin.timeOff");
  const tCommon = useTranslations("dashboard.common");
  const format = useFormatter();
  const { run, pending } = useAction();
  const [target, setTarget] = useState<Absence | null>(null);

  // Joined with a hyphen rather than Intl's range format, which inserts an en dash.
  function range(a: TimeOff) {
    const from = format.dateTime(a.startsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    const sameDay = dateKey(a.startsAt) === dateKey(a.endsAt);
    const to = sameDay
      ? format.dateTime(a.endsAt, { hour: "2-digit", minute: "2-digit" })
      : format.dateTime(a.endsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    return `${from} - ${to}`;
  }

  return (
    <Card title={t("title")} description={t("hint")}>
      {absences.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="-mx-4 divide-y divide-line sm:-mx-6">
          {absences.map((a) => (
            <li key={a.id} className={cn("flex items-center gap-3 px-4 py-2.5 sm:px-6", a.past && "opacity-55")}>
              <div className="min-w-0 flex-1">
                <p className="tabular text-sm font-medium">{range(a)}</p>
                <p className="truncate text-sm text-muted">{a.reason || t("noReason")}</p>
              </div>
              <Button variant="ghost" size="icon" aria-label={tCommon("delete")} onClick={() => setTarget(a)} className="size-11">
                <Trash size={18} />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={!!target}
        onClose={() => setTarget(null)}
        title={t("deleteTitle")}
        description={target ? range(target) : null}
        confirmLabel={tCommon("delete")}
        pending={pending}
        onConfirm={() => target && run(() => deleteTimeOff(target.id), { success: t("deleted"), onSuccess: () => setTarget(null) })}
      />
    </Card>
  );
}
