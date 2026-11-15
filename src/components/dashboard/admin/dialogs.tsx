"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Check, Copy, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";

/** "Are you sure?" step before anything destructive. With `word`, the user has to type it first. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  pending,
  tone = "danger",
  word,
  wordLabel,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (typed: string) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel: ReactNode;
  pending?: boolean;
  tone?: "danger" | "primary";
  word?: string;
  wordLabel?: ReactNode;
  error?: ReactNode;
}) {
  const t = useTranslations("dashboard.common");
  const [typed, setTyped] = useState("");
  const locked = !!word && typed.trim().toUpperCase() !== word;
  const close = () => {
    setTyped("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={pending}>
            {t("cancel")}
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} onClick={() => onConfirm(typed)} disabled={pending || locked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {description ? <div className="text-sm leading-relaxed text-muted">{description}</div> : null}
        {word ? (
          <Field label={wordLabel} htmlFor="confirm-word" error={error}>
            <Input
              id="confirm-word"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-invalid={!!error}
              className="font-display tracking-widest uppercase"
            />
          </Field>
        ) : null}
      </div>
    </Dialog>
  );
}

/** Shows a freshly generated password exactly once, with copy buttons. */
export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: { email: string; password: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("dashAdmin.credentials");
  return (
    <Dialog
      open={!!credentials}
      onClose={onClose}
      title={t("title")}
      footer={
        <Button variant="primary" onClick={onClose}>
          {t("done")}
        </Button>
      }
    >
      {credentials ? (
        <div className="flex flex-col gap-4">
          <p className="flex gap-2.5 rounded-xl border border-warning/25 bg-warning/12 p-3 text-sm text-fg">
            <WarningCircle size={20} className="shrink-0 text-warning" />
            {t("once")}
          </p>
          <CopyRow label={t("email")} value={credentials.email} />
          <CopyRow label={t("password")} value={credentials.password} mono />
        </div>
      ) : null}
    </Dialog>
  );
}

function CopyRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  const t = useTranslations("dashAdmin.credentials");
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-line-strong bg-surface-2 py-1.5 pr-1.5 pl-3.5">
        <span className={mono ? "min-w-0 flex-1 font-mono text-base tracking-wide break-all" : "min-w-0 flex-1 break-all"}>{value}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("copy")}
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(t("copied"));
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
        </Button>
      </div>
    </div>
  );
}
