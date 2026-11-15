"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowSquareOut, CircleNotch, FilmStrip, Pause, Play, TiktokLogo, UploadSimple, VideoCamera } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { addVideo } from "@/lib/dashboard/admin/actions/content";
import type { MediaItem } from "@/lib/dashboard/admin/content";
import { ImageUpload } from "../image-upload";
import type { Lang } from "../locale-tabs";
import { Switch } from "../switch";
import { UploadFailed, uploadErrorKey, uploadFile } from "../upload";
import { useAction } from "../use-action";
import { BarberSelect, CaptionFields, MediaTile, type BarberOption } from "./media-tile";

export function VideosManager({ items, barbers }: { items: MediaItem[]; barbers: BarberOption[] }) {
  const t = useTranslations("dashAdmin.videos");
  const [adding, setAdding] = useState<"video" | "tiktok" | null>(null);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">{t("summary", { count: items.length })}</p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button onClick={() => setAdding("video")}>
            <UploadSimple size={18} />
            {t("addVideo")}
          </Button>
          <Button variant="secondary" onClick={() => setAdding("tiktok")}>
            <TiktokLogo size={18} />
            {t("addTiktok")}
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={<FilmStrip />} title={t("empty")} description={t("emptyHint")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {items.map((item, i) => (
            <MediaTile key={item.id} item={item} first={i === 0} last={i === items.length - 1} barbers={barbers} aspect="aspect-[9/16]">
              {item.kind === "tiktok" ? <TiktokPreview url={item.src} /> : <VideoPreview src={item.src} poster={item.poster} />}
            </MediaTile>
          ))}
        </ul>
      )}

      {adding ? <AddVideoDialog key={adding} kind={adding} barbers={barbers} onClose={() => setAdding(null)} /> : null}
    </>
  );
}

/** Muted inline preview: plays on hover (desktop) or with the play button (phones). */
function VideoPreview({ src, poster }: { src: string; poster: string | null }) {
  const t = useTranslations("dashAdmin.videos");
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  return (
    <div className="absolute inset-0" onPointerEnter={(e) => e.pointerType === "mouse" && ref.current?.play()} onPointerLeave={(e) => e.pointerType === "mouse" && ref.current?.pause()}>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted
        playsInline
        loop
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="absolute inset-0 size-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? t("pause") : t("play")}
        className="absolute bottom-1.5 left-1.5 flex size-11 items-center justify-center rounded-full bg-bg/60 text-fg backdrop-blur-md"
      >
        {playing ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
      </button>
    </div>
  );
}

function TiktokPreview({ url }: { url: string }) {
  const t = useTranslations("dashAdmin.videos");
  const handle = url.match(/tiktok\.com\/(@[^/]+)/)?.[1];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2 p-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-fg text-bg">
        <TiktokLogo size={30} weight="fill" />
      </span>
      {handle ? <p className="max-w-full truncate text-sm font-medium">{handle}</p> : null}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm hover:bg-surface-3"
      >
        {t("openTiktok")}
        <ArrowSquareOut size={14} />
      </a>
    </div>
  );
}

function AddVideoDialog({ kind, barbers, onClose }: { kind: "video" | "tiktok"; barbers: BarberOption[]; onClose: () => void }) {
  const t = useTranslations("dashAdmin.videos");
  const tUpload = useTranslations("dashAdmin.upload");
  const tCommon = useTranslations("dashboard.common");
  const tMedia = useTranslations("dashAdmin.media");
  const { run, pending, fieldError } = useAction();
  const fileInput = useRef<HTMLInputElement>(null);
  const [lang, setLang] = useState<Lang>("ro");
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    src: "",
    fileName: "",
    poster: null as string | null,
    caption: { ro: "", ru: "" },
    barberId: null as number | null,
    featured: false,
  });
  const patch = (next: Partial<typeof form>) => setForm((f) => ({ ...f, ...next }));

  async function pickVideo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadFile(file, "media");
      if (res.kind !== "video") throw new UploadFailed("unsupported_type");
      patch({ src: res.src, fileName: file.name });
    } catch (e) {
      toast.error(tUpload(uploadErrorKey(e)));
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit() {
    const common = { caption: form.caption, barberId: form.barberId, featured: form.featured };
    run(() => (kind === "video" ? addVideo({ kind, src: form.src, poster: form.poster, ...common }) : addVideo({ kind, src: form.src, ...common })), {
      success: t("added"),
      onSuccess: onClose,
    });
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={kind === "video" ? t("addVideo") : t("addTiktok")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || uploading || !form.src}>
            {pending ? tCommon("loading") : tCommon("add")}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {kind === "video" ? (
          <>
            <Field label={t("file")} htmlFor="video-file" hint={t("fileHint")} error={fieldError("src")}>
              <button
                id="video-file"
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="flex min-h-14 items-center gap-3 rounded-xl border border-dashed border-line-strong bg-surface-2 px-4 py-3 text-left text-sm hover:border-accent"
              >
                {uploading ? <CircleNotch size={20} className="shrink-0 animate-spin" /> : <VideoCamera size={20} className="shrink-0 text-muted" />}
                <span className="min-w-0 truncate">{uploading ? t("uploading") : form.fileName || t("chooseFile")}</span>
              </button>
            </Field>
            <input
              ref={fileInput}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => pickVideo(e.target.files?.[0])}
            />
            <div>
              <p className="mb-2 text-sm font-medium">{tMedia("poster")}</p>
              <ImageUpload value={form.poster} onChange={(poster) => patch({ poster })} folder="media" aspect="aspect-[9/16] max-w-36" sizes="144px" />
              <p className="mt-2 text-sm text-muted">{t("posterHint")}</p>
            </div>
          </>
        ) : (
          <Field label={t("tiktokUrl")} htmlFor="tiktok-url" hint={t("tiktokHint")} error={fieldError("src")}>
            <Input
              id="tiktok-url"
              type="url"
              inputMode="url"
              value={form.src}
              onChange={(e) => patch({ src: e.target.value })}
              placeholder="https://www.tiktok.com/@molodoy/video/7300000000000000000"
              spellCheck={false}
              autoCapitalize="none"
              aria-invalid={!!fieldError("src")}
            />
          </Field>
        )}
        <CaptionFields lang={lang} setLang={setLang} value={form.caption} onChange={(caption) => patch({ caption })} error={fieldError} />
        <BarberSelect barbers={barbers} value={form.barberId} onChange={(barberId) => patch({ barberId })} error={fieldError("barberId")} />
        <Switch checked={form.featured} onChange={(featured) => patch({ featured })} label={tMedia("featured")} description={tMedia("featuredHint")} />
      </div>
    </Dialog>
  );
}
