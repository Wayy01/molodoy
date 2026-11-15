"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Markdown from "react-markdown";
import { Trash } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import type { Localized, Post } from "@/db/schema";
import { deletePost, savePost } from "@/lib/dashboard/admin/actions/content";
import { cn, slugify } from "@/lib/utils";
import { ConfirmDialog } from "../dialogs";
import { ImageUpload } from "../image-upload";
import { Card, SaveBar } from "../layout-bits";
import { LocaleTabs, type Lang } from "../locale-tabs";
import { useAction } from "../use-action";

export type PostDraft = Pick<Post, "slug" | "cover" | "status"> & {
  id: number | null;
  title: Localized;
  excerpt: Localized;
  body: Localized;
  /** "YYYY-MM-DDTHH:mm" in Chișinău time, "" when not set. */
  publishedAt: string;
};

export function PostForm({ post }: { post: PostDraft }) {
  const t = useTranslations("dashAdmin.postForm");
  const tCommon = useTranslations("dashboard.common");
  const router = useRouter();
  const { run, pending, fieldError, hasErrorUnder } = useAction();
  const remove = useAction();
  const [lang, setLang] = useState<Lang>("ro");
  const [pane, setPane] = useState<"write" | "preview">("write");
  const [slugTouched, setSlugTouched] = useState(post.id !== null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState(post);
  const patch = (next: Partial<PostDraft>) => setForm((f) => ({ ...f, ...next }));
  const setLocalized = (field: "title" | "excerpt" | "body", value: string) =>
    setForm((f) => ({
      ...f,
      [field]: { ...f[field], [lang]: value },
      ...(field === "title" && lang === "ro" && !slugTouched ? { slug: slugify(value) } : {}),
    }));
  const id = post.id;
  const langErrors = (l: Lang) => ["title", "excerpt", "body"].some((f) => hasErrorUnder(`${f}.${l}`));

  function submit() {
    run(() => savePost(form), {
      success: tCommon("saved"),
      onSuccess: ({ id }) => {
        if (post.id === null) router.replace(`/dashboard/content/blog/${id}`);
      },
    });
  }

  return (
    <form
      className="flex flex-col gap-6 pb-24 lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <Card title={t("text")} actions={<LocaleTabs value={lang} onChange={setLang} errors={{ ro: langErrors("ro"), ru: langErrors("ru") }} />}>
          <div className="flex flex-col gap-4">
            <Field label={t("title")} htmlFor="post-title" error={fieldError(`title.${lang}`)}>
              <Input
                id="post-title"
                key={`title-${lang}`}
                lang={lang}
                value={form.title[lang]}
                onChange={(e) => setLocalized("title", e.target.value)}
                className="text-base font-medium"
                aria-invalid={!!fieldError(`title.${lang}`)}
              />
            </Field>
            <Field label={t("excerpt")} htmlFor="post-excerpt" hint={t("excerptHint")} error={fieldError(`excerpt.${lang}`)}>
              <Textarea
                id="post-excerpt"
                key={`excerpt-${lang}`}
                lang={lang}
                rows={2}
                className="min-h-20"
                value={form.excerpt[lang]}
                onChange={(e) => setLocalized("excerpt", e.target.value)}
                aria-invalid={!!fieldError(`excerpt.${lang}`)}
              />
            </Field>
          </div>
        </Card>

        <div className="flex flex-col gap-6 max-lg:order-last lg:row-span-2">
          <Card title={t("publishing")}>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-surface-2 p-1" role="radiogroup" aria-label={t("status")}>
                {(["draft", "published"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={form.status === s}
                    onClick={() => patch({ status: s })}
                    className={cn(
                      "h-10 rounded-full text-sm font-medium transition-colors",
                      form.status === s ? "bg-surface text-fg shadow-sm" : "text-muted hover:text-fg",
                    )}
                  >
                    {t(`statuses.${s}`)}
                  </button>
                ))}
              </div>
              <Field label={t("publishedAt")} htmlFor="post-date" hint={t("publishedAtHint")} error={fieldError("publishedAt")}>
                <Input
                  id="post-date"
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => patch({ publishedAt: e.target.value })}
                  className="tabular"
                  aria-invalid={!!fieldError("publishedAt")}
                />
              </Field>
              <Field label={t("slug")} htmlFor="post-slug" hint={t("slugHint")} error={fieldError("slug")}>
                <Input
                  id="post-slug"
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    patch({ slug: e.target.value.toLowerCase() });
                  }}
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={!!fieldError("slug")}
                />
              </Field>
            </div>
          </Card>
          <Card title={t("cover")}>
            <ImageUpload value={form.cover} onChange={(cover) => patch({ cover })} folder="posts" aspect="aspect-[16/10]" sizes="340px" />
          </Card>
          {post.id ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)} className="self-start">
              <Trash size={16} />
              {t("delete")}
            </Button>
          ) : null}
        </div>

        <Card
          title={t("body")}
          description={t("bodyHint")}
          actions={
            <div className="flex rounded-full border border-line bg-surface-2 p-1 lg:hidden" role="tablist">
              {(["write", "preview"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={pane === p}
                  onClick={() => setPane(p)}
                  className={cn("h-9 rounded-full px-4 text-sm font-medium", pane === p ? "bg-surface text-fg shadow-sm" : "text-muted")}
                >
                  {t(p)}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className={cn(pane !== "write" && "hidden lg:block")}>
              <label htmlFor="post-body" className="sr-only">
                {t("body")}
              </label>
              <Textarea
                id="post-body"
                key={`body-${lang}`}
                lang={lang}
                value={form.body[lang]}
                onChange={(e) => setLocalized("body", e.target.value)}
                className="min-h-[420px] font-mono text-sm lg:min-h-[560px]"
                spellCheck
                aria-invalid={!!fieldError(`body.${lang}`)}
              />
              {fieldError(`body.${lang}`) ? (
                <p className="mt-2 text-sm text-danger" role="alert">
                  {fieldError(`body.${lang}`)}
                </p>
              ) : null}
            </div>
            <div className={cn("min-h-[420px] rounded-xl border border-line bg-bg/40 px-4 py-4 lg:max-h-[560px] lg:overflow-y-auto", pane !== "preview" && "hidden lg:block")}>
              {form.body[lang].trim() ? (
                <div className="prose-molodoy" lang={lang}>
                  <Markdown>{form.body[lang]}</Markdown>
                </div>
              ) : (
                <p className="text-sm text-subtle">{t("previewEmpty")}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <SaveBar>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("loading") : form.status === "published" ? t("savePublished") : t("saveDraft")}
        </Button>
      </SaveBar>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title={t("deleteTitle")}
        description={t("deleteText")}
        confirmLabel={tCommon("delete")}
        pending={remove.pending}
        onConfirm={() =>
          id &&
          remove.run(() => deletePost(id), {
            success: t("deleted"),
            onSuccess: () => router.replace("/dashboard/content/blog"),
          })
        }
      />
    </form>
  );
}
