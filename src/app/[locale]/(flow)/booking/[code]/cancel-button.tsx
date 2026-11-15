"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cancelBooking } from "@/lib/booking/actions";

export function CancelButton({ code, phone }: { code: string; phone: string }) {
  const t = useTranslations("booking.done");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <Button variant="ghost" className="text-muted hover:text-danger" onClick={() => setOpen(true)}>
        {t("cancel")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("cancelConfirm")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("keep")}
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await cancelBooking(code);
                  if (res.ok) {
                    setOpen(false);
                    router.refresh();
                  } else if (res.error === "too_late") {
                    toast.error(t("tooLate", { phone }));
                    setOpen(false);
                  } else {
                    router.refresh();
                  }
                })
              }
            >
              {t("cancelYes")}
            </Button>
          </>
        }
      >
        <p className="text-muted">{t("cancelNote")}</p>
      </Dialog>
    </>
  );
}
