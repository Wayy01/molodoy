"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Lock, PencilSimple, Star, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { deleteMedia, moveMedia, setMediaFeatured, updateMedia } from "@/lib/dashboard/admin/actions/content";
import type { MediaItem } from "@/lib/dashboard/admin/content";
import { cn, t9n } from "@/lib/utils";
import { ConfirmDialog } from "../dialogs";
import { ImageUpload } from "../image-upload";
import { LocaleTabs, type Lang } from "../locale-tabs";
import { Switch } from "../switch";
import { useAction } from "../use-action";

export type BarberOption = { id: number; name: string };

/** One gallery/video card: preview plus featured, reorder and edit controls (44px targets). */
export function MediaTile({
  item,
  first,
  last,
  barbers,
  aspect,
  children,
}: {
  item: MediaItem;
  first: boolean;
  last: boolean;
  barbers: BarberOption[];
  aspect: string;
  children: ReactNode;
}) {
  const t = useTranslations("dashAdmin.media");
  const locale = useLocale();
  const { run, pending } = useAction();
  const [editing, setEditing] = useState(false);
  const caption = t9n(item.caption, locale);

  return (
    <li className={cn("flex flex-col overflow-hidden rounded-2xl border border-line bg-surface", pending && "opacity-60")}>
      <div className={cn("relative bg-surface-2", aspect)}>
        {children}
        <button
          type="button"
          disabled={!item.editable || pending}
          onClick={() => run(() => setMediaFeatured(item.id, !item.featured))}
          aria-pressed={item.featured}
          aria-label={item.featured ? t("unfeature") : t("feature")}
          className={cn(
            "absolute top-1.5 right-1.5 flex size-11 items-center justify-center rounded-full backdrop-blur-md transition-colors",
            item.featured ? "bg-accent text-accent-fg" : "bg-bg/60 text-fg hover:bg-bg/80",
          )}
        >
          <Star size={18} weight={item.featured ? "fill" : "regular"} />
        </button>
        {!item.editable ? (
          <span className="absolute top-3 left-3 flex size-7 items-center justify-center rounded-full bg-bg/60 text-muted backdrop-blur-md" title={t("locked")}>
            <Lock size={14} />
          </span>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 pt-2.5">
        <p className={cn("line-clamp-1 text-sm", caption ? "text-fg" : "text-subtle")}>{caption || t("noCaption")}</p>
        {item.barberName ? <p className="truncate text-xs text-muted">{item.barberName}</p> : null}
      </div>
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex">
          <Button variant="ghost" size="icon" className="size-11" disabled={first || !item.editable || pending} aria-label={t("moveUp")} onClick={() => run(() => moveMedia(item.id, "up"))}>
            <ArrowUp size={18} />
          </Button>
          <Button variant="ghost" size="icon" className="size-11" disabled={last || !item.editable || pending} aria-label={t("moveDown")} onClick={() => run(() => moveMedia(item.id, "down"))}>
            <ArrowDown size={18} />
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="size-11" disabled={!item.editable} aria-label={t("edit")} onClick={() => setEditing(true)}>
          <PencilSimple size={18} />
        </Button>
      </div>
      {editing ? <MediaEditDialog item={item} barbers={barbers} onClose={() => setEditing(false)} /> : null}
    </li>
  );
}

function MediaEditDialog({ item, barbers, onClose }: { item: MediaItem; barbers: BarberOption[]; onClose: () => void }) {
  const t = useTranslations("dashAdmin.media");
  const tCommon = useTranslations("dashboard.common");
  const { run, pending, fieldError } = useAction();
  const remove = useAction();
  const [lang, setLang] = useState<Lang>("ro");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    caption: item.caption ?? { ro: "", ru: "" },
    barberId: item.barberId,
    featured: item.featured,
    poster: item.poster,
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("editTitle")}
      footer={
        <>
          <Button variant="ghost" className="mr-auto text-danger" aria-label={tCommon("delete")} onClick={() => setConfirmDelete(true)} disabled={pending}>
            <Trash size={16} />
            <span className="hidden sm:inline" aria-hidden>
              {tCommon("delete")}
            </span>
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              run(() => updateMedia({ id: item.id, ...form, poster: item.kind === "video" ? form.poster : undefined }), {
                success: tCommon("saved"),
                onSuccess: onClose,
              })
            }
          >
            {pending ? tCommon("loading") : tCommon("save")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <CaptionFields lang={lang} setLang={setLang} value={form.caption} onChange={(caption) => setForm((f) => ({ ...f, caption }))} error={fieldError} />
        <BarberSelect barbers={barbers} value={form.barberId} onChange={(barberId) => setForm((f) => ({ ...f, barberId }))} error={fieldError("barberId")} />
        {item.kind === "video" ? (
          <div>
            <p className="mb-2 text-sm font-medium">{t("poster")}</p>
            <ImageUpload value={form.poster} onChange={(poster) => setForm((f) => ({ ...f, poster }))} folder="media" aspect="aspect-[9/16] max-w-36" sizes="144px" />
          </div>
        ) : null}
        <Switch checked={form.featured} onChange={(featured) => setForm((f) => ({ ...f, featured }))} label={t("featured")} description={t("featuredHint")} />
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteTitle")}
        description={t("deleteText")}
        confirmLabel={tCommon("delete")}
        pending={remove.pending}
        onConfirm={() => remove.run(() => deleteMedia(item.id), { success: t("deleted"), onSuccess: onClose })}
      />
    </Dialog>
  );
}

export function CaptionFields({
  lang,
  setLang,
  value,
  onChange,
  error,
}: {
  lang: Lang;
  setLang: (lang: Lang) => void;
  value: { ro: string; ru: string };
  onChange: (value: { ro: string; ru: string }) => void;
  error: (path: string) => string | undefined;
}) {
  const t = useTranslations("dashAdmin.media");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{t("caption")}</span>
        <LocaleTabs value={lang} onChange={setLang} errors={{ ro: !!error("caption.ro"), ru: !!error("caption.ru") }} />
      </div>
      <Field label={<span className="sr-only">{t("caption")}</span>} htmlFor="media-caption" error={error(`caption.${lang}`)}>
        <Input
          id="media-caption"
          key={lang}
          lang={lang}
          value={value[lang]}
          onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
          placeholder={t("captionPlaceholder")}
        />
      </Field>
    </div>
  );
}

export function BarberSelect({
  barbers,
  value,
  onChange,
  error,
}: {
  barbers: BarberOption[];
  value: number | null;
  onChange: (id: number | null) => void;
  error?: string;
}) {
  const t = useTranslations("dashAdmin.media");
  return (
    <Field label={t("barber")} htmlFor="media-barber" hint={t("barberHint")} error={error}>
      <Select id="media-barber" value={value ?? ""} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">{t("noBarber")}</option>
        {barbers.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}
