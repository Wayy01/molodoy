"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MapTrifold } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { Location } from "@/db/schema";
import { saveLocation } from "@/lib/dashboard/admin/actions/catalog";
import { isMapEmbedUrl } from "@/lib/maps";
import { formatPhone } from "@/lib/utils";
import { ImageUpload } from "../image-upload";
import { Card, SaveBar } from "../layout-bits";
import { LocaleTabs, type Lang } from "../locale-tabs";
import { Switch } from "../switch";
import { useAction } from "../use-action";
import { timeOptions } from "../team/hours-editor";

/** Same rule as the server: the embed URL itself, or the src of a pasted <iframe>. */
function embedSrc(value: string) {
  const src = value.match(/src=["']([^"']+)["']/)?.[1] ?? value.trim();
  return isMapEmbedUrl(src) ? src : null;
}

export function LocationForm({ location }: { location: Location }) {
  const t = useTranslations("dashAdmin.locationForm");
  const tCommon = useTranslations("dashboard.common");
  const { run, pending, fieldError, hasErrorUnder } = useAction();
  const [lang, setLang] = useState<Lang>("ro");
  const [form, setForm] = useState({
    name: location.name,
    address: location.address,
    phone: formatPhone(location.phone),
    opensAt: location.opensAt,
    closesAt: location.closesAt,
    mapEmbedUrl: location.mapEmbedUrl ?? "",
    mapLink: location.mapLink ?? "",
    photo: location.photo,
    active: location.active,
    sortOrder: String(location.sortOrder),
  });
  const patch = (next: Partial<typeof form>) => setForm((f) => ({ ...f, ...next }));
  const preview = embedSrc(form.mapEmbedUrl);

  return (
    <form
      className="grid gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveLocation({ id: location.id, ...form, sortOrder: Number(form.sortOrder) || 0 }), { success: tCommon("saved") });
      }}
    >
      <div className="flex flex-col gap-6">
        <Card
          title={t("details")}
          actions={
            <LocaleTabs
              value={lang}
              onChange={setLang}
              errors={{ ro: hasErrorUnder("name.ro") || hasErrorUnder("address.ro"), ru: hasErrorUnder("name.ru") || hasErrorUnder("address.ru") }}
            />
          }
        >
          <div className="flex flex-col gap-4">
            <Field label={t("name")} htmlFor="loc-name" error={fieldError(`name.${lang}`)}>
              <Input
                id="loc-name"
                key={`name-${lang}`}
                lang={lang}
                value={form.name[lang]}
                onChange={(e) => patch({ name: { ...form.name, [lang]: e.target.value } })}
                aria-invalid={!!fieldError(`name.${lang}`)}
              />
            </Field>
            <Field label={t("address")} htmlFor="loc-address" error={fieldError(`address.${lang}`)}>
              <Input
                id="loc-address"
                key={`address-${lang}`}
                lang={lang}
                value={form.address[lang]}
                onChange={(e) => patch({ address: { ...form.address, [lang]: e.target.value } })}
                aria-invalid={!!fieldError(`address.${lang}`)}
              />
            </Field>
            <Field label={t("phone")} htmlFor="loc-phone" error={fieldError("phone")}>
              <Input
                id="loc-phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={(e) => patch({ phone: e.target.value })}
                className="tabular"
                aria-invalid={!!fieldError("phone")}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("opensAt")} htmlFor="loc-opens" error={fieldError("opensAt")}>
                <Select id="loc-opens" value={form.opensAt} onChange={(e) => patch({ opensAt: e.target.value })} className="tabular">
                  {timeOptions(form.opensAt).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("closesAt")} htmlFor="loc-closes" error={fieldError("closesAt")}>
                <Select
                  id="loc-closes"
                  value={form.closesAt}
                  onChange={(e) => patch({ closesAt: e.target.value })}
                  className="tabular"
                  aria-invalid={!!fieldError("closesAt")}
                >
                  {timeOptions(form.closesAt).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </Card>

        <Card title={t("map")} description={t("mapHint")}>
          <div className="flex flex-col gap-4">
            <Field label={t("mapEmbedUrl")} htmlFor="loc-embed" error={fieldError("mapEmbedUrl")}>
              <Textarea
                id="loc-embed"
                value={form.mapEmbedUrl}
                onChange={(e) => patch({ mapEmbedUrl: e.target.value })}
                rows={3}
                className="min-h-20 font-mono text-xs break-all"
                spellCheck={false}
                aria-invalid={!!fieldError("mapEmbedUrl")}
              />
            </Field>
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-line bg-surface-2">
              {preview ? (
                <iframe
                  key={preview}
                  src={preview}
                  title={t("mapPreview")}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="absolute inset-0 size-full border-0"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted">
                  <MapTrifold size={28} />
                  {t("noPreview")}
                </div>
              )}
            </div>
            <Field label={t("mapLink")} htmlFor="loc-link" hint={t("mapLinkHint")} error={fieldError("mapLink")}>
              <Input
                id="loc-link"
                type="url"
                inputMode="url"
                value={form.mapLink}
                onChange={(e) => patch({ mapLink: e.target.value })}
                spellCheck={false}
                aria-invalid={!!fieldError("mapLink")}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="flex flex-col gap-6 lg:sticky lg:top-24">
        <Card title={t("photo")}>
          <ImageUpload value={form.photo} onChange={(photo) => patch({ photo })} folder="locations" aspect="aspect-[16/10]" sizes="380px" />
        </Card>
        <Card title={t("visibility")}>
          <div className="flex flex-col gap-4">
            <Switch checked={form.active} onChange={(active) => patch({ active })} label={t("active")} description={t("activeHint")} />
            <Field label={t("sortOrder")} htmlFor="loc-sort" hint={t("sortOrderHint")}>
              <Input
                id="loc-sort"
                type="number"
                inputMode="numeric"
                min={0}
                value={form.sortOrder}
                onChange={(e) => patch({ sortOrder: e.target.value })}
                className="tabular"
              />
            </Field>
          </div>
        </Card>
      </div>

      <SaveBar className="lg:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("loading") : tCommon("save")}
        </Button>
      </SaveBar>
    </form>
  );
}
