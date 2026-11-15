"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CircleNotch, ImagesSquare, UploadSimple } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { addPhotos } from "@/lib/dashboard/admin/actions/content";
import type { MediaItem } from "@/lib/dashboard/admin/content";
import { UploadFailed, uploadErrorKey, uploadFile, type Uploaded } from "../upload";
import { useAction } from "../use-action";
import { MediaTile, type BarberOption } from "./media-tile";

const PARALLEL = 3;

export function GalleryManager({ items, barbers }: { items: MediaItem[]; barbers: BarberOption[] }) {
  const t = useTranslations("dashAdmin.gallery");
  const tUpload = useTranslations("dashAdmin.upload");
  const input = useRef<HTMLInputElement>(null);
  const { run, pending } = useAction();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function upload(files: File[]) {
    if (!files.length) return;
    setProgress({ done: 0, total: files.length });
    const stored: Uploaded[] = [];
    const errors: unknown[] = [];
    const queue = [...files];
    // A few at a time: phones on 4G choke on twenty parallel 5 MB uploads.
    await Promise.all(
      Array.from({ length: Math.min(PARALLEL, files.length) }, async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          try {
            const res = await uploadFile(file, "media");
            if (res.kind === "photo") stored.push(res);
            else errors.push(new UploadFailed("unsupported_type"));
          } catch (e) {
            errors.push(e);
          }
          setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        }
      }),
    );
    setProgress(null);
    if (input.current) input.current.value = "";
    if (errors.length) toast.error(t("someFailed", { count: errors.length, reason: tUpload(uploadErrorKey(errors[0])) }));
    if (stored.length) {
      run(() => addPhotos(stored.map(({ src, width, height }) => ({ src, width, height }))), {
        success: t("uploaded", { count: stored.length }),
      });
    }
  }

  const busy = !!progress || pending;

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{t("summary", { count: items.length, featured: items.filter((i) => i.featured).length })}</p>
        <Button onClick={() => input.current?.click()} disabled={busy} className="w-full sm:w-auto">
          {busy ? <CircleNotch size={18} className="animate-spin" /> : <UploadSimple size={18} />}
          {progress ? t("uploading", { done: progress.done, total: progress.total }) : t("upload")}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => upload(Array.from(e.target.files ?? []))}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<ImagesSquare />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item, i) => (
            <MediaTile key={item.id} item={item} first={i === 0} last={i === items.length - 1} barbers={barbers} aspect="aspect-[4/5]">
              <Image src={item.src} alt="" fill sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw" className="object-cover" />
            </MediaTile>
          ))}
        </ul>
      )}
    </>
  );
}
