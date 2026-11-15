"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { FieldErrors, Result } from "@/lib/dashboard/admin/result";

/**
 * Runs a server action inside a transition: toasts the outcome and keeps field errors
 * around so forms can show them under the right input.
 */
export function useAction() {
  const t = useTranslations("dashAdmin.errors");
  const tCommon = useTranslations("dashboard.common");
  const [pending, start] = useTransition();
  const [fields, setFields] = useState<FieldErrors>({});

  const message = (code: string) => (t.has(code) ? t(code) : t("invalid"));

  function run<T>(action: () => Promise<Result<T>>, opts: { success?: string; onSuccess?: (data: T) => void } = {}) {
    start(async () => {
      let res: Result<T>;
      try {
        res = await action();
      } catch {
        toast.error(tCommon("error"));
        return;
      }
      if (res.ok) {
        setFields({});
        if (opts.success) toast.success(opts.success);
        opts.onSuccess?.(res.data);
        return;
      }
      const fieldErrors = res.fields ?? {};
      setFields(fieldErrors);
      toast.error(Object.keys(fieldErrors).length ? t("checkFields") : message(res.error));
    });
  }

  return {
    run,
    pending,
    fields,
    /** Translated error for a field path, e.g. "phone" or "title.ru". */
    fieldError: (path: string) => (fields[path] ? message(fields[path]) : undefined),
    /** True when any error sits under `prefix.` (to flag a language tab). */
    hasErrorUnder: (prefix: string) => Object.keys(fields).some((k) => k === prefix || k.startsWith(`${prefix}.`)),
    clearErrors: () => setFields({}),
  };
}
