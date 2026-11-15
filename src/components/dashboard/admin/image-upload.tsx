"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleNotch, ImageSquare, Trash, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadFailed, uploadErrorKey, uploadFile, type UploadFolder } from "./upload";

/** Single image picker: uploads straight away and hands back the stored path. */
export function ImageUpload({
  value,
  onChange,
  folder,
  aspect = "aspect-square",
  sizes = "320px",
  className,
}: {
  value: string | null;
  onChange: (src: string | null) => void;
  folder: UploadFolder;
  aspect?: string;
  sizes?: string;
  className?: string;
}) {
  const t = useTranslations("dashAdmin.upload");
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const res = await uploadFile(file, folder);
      if (res.kind !== "photo") throw new UploadFailed("unsupported_type");
      onChange(res.src);
    } catch (e) {
      toast.error(t(uploadErrorKey(e)));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className={cn(
          "group relative w-full overflow-hidden rounded-2xl border border-dashed border-line-strong bg-surface-2 transition-colors hover:border-accent",
          aspect,
        )}
        aria-label={value ? t("change") : t("choose")}
      >
        {value ? (
          <Image src={value} alt="" fill sizes={sizes} className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
            <ImageSquare size={28} />
            <span className="text-sm">{t("choose")}</span>
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center bg-bg/70">
            <CircleNotch size={26} className="animate-spin text-fg" />
          </span>
        ) : null}
      </button>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy}>
          <UploadSimple size={16} />
          {value ? t("change") : t("choose")}
        </Button>
        {value ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)} disabled={busy}>
            <Trash size={16} />
            {t("remove")}
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
