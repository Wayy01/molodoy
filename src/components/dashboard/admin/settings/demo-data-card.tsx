"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Database, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { deleteDemoData } from "@/lib/dashboard/admin/actions/settings";
import { DEMO_CONFIRM_WORD } from "@/lib/dashboard/admin/constants";
import { ConfirmDialog } from "../dialogs";
import { Card } from "../layout-bits";
import { useAction } from "../use-action";

export function DemoDataCard({ counts }: { counts: { appointments: number; clients: number } }) {
  const t = useTranslations("dashAdmin.demo");
  const { run, pending, fieldError } = useAction();
  const [open, setOpen] = useState(false);
  const empty = counts.appointments === 0 && counts.clients === 0;

  return (
    <Card title={t("title")}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3 rounded-xl border border-line bg-surface-2 p-4">
          <Database size={22} className="shrink-0 text-muted" />
          <div className="text-sm leading-relaxed">
            <p>{empty ? t("none") : t("explain")}</p>
            {empty ? null : (
              <p className="tabular mt-2 text-muted">{t("counts", { appointments: counts.appointments, clients: counts.clients })}</p>
            )}
          </div>
        </div>
        {empty ? null : (
          <Button variant="danger" onClick={() => setOpen(true)} className="w-full sm:w-auto sm:self-start">
            <Trash size={16} />
            {t("delete")}
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("confirmTitle")}
        description={t("confirmText")}
        confirmLabel={t("delete")}
        pending={pending}
        word={DEMO_CONFIRM_WORD}
        wordLabel={t("typeWord", { word: DEMO_CONFIRM_WORD })}
        error={fieldError("confirm")}
        onConfirm={(typed) =>
          run(() => deleteDemoData(typed), {
            onSuccess: (res) => {
              setOpen(false);
              toast.success(t("done", res));
            },
          })
        }
      />
    </Card>
  );
}
