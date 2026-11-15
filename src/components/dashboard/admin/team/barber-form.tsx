"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { LevelBadge } from "@/components/ui/badge";
import type { Barber, BarberLevel, Localized, WeeklyHours } from "@/db/schema";
import { saveBarber } from "@/lib/dashboard/admin/actions/team";
import { cn, slugify, t9n } from "@/lib/utils";
import { ImageUpload } from "../image-upload";
import { Card, SaveBar } from "../layout-bits";
import { LocaleTabs, type Lang } from "../locale-tabs";
import { Switch } from "../switch";
import { useAction } from "../use-action";
import { HoursEditor } from "./hours-editor";

const LEVELS: BarberLevel[] = ["barber", "pro", "top"];

function instagramHandle(url: string | null) {
  return url?.match(/instagram\.com\/([^/?#]+)/)?.[1] ?? "";
}

export function BarberForm({
  barber,
  locations,
  canPickLocation,
}: {
  barber: Pick<Barber, "name" | "slug" | "level" | "locationId" | "photo" | "bio" | "instagram" | "workingHours" | "sortOrder" | "active"> & {
    id: number | null;
  };
  locations: Array<{ id: number; name: Localized }>;
  canPickLocation: boolean;
}) {
  const t = useTranslations("dashAdmin.barberForm");
  const tLevels = useTranslations("common.levels");
  const tCommon = useTranslations("dashboard.common");
  const locale = useLocale();
  const router = useRouter();
  const { run, pending, fieldError, hasErrorUnder } = useAction();
  const [lang, setLang] = useState<Lang>("ro");
  const [slugTouched, setSlugTouched] = useState(barber.id !== null);
  const [form, setForm] = useState({
    name: barber.name,
    slug: barber.slug,
    level: barber.level,
    locationId: barber.locationId,
    photo: barber.photo,
    bio: barber.bio ?? { ro: "", ru: "" },
    instagram: instagramHandle(barber.instagram),
    workingHours: barber.workingHours as WeeklyHours,
    sortOrder: String(barber.sortOrder),
    active: barber.active,
  });
  const patch = (next: Partial<typeof form>) => setForm((f) => ({ ...f, ...next }));

  function submit() {
    run(
      () =>
        saveBarber({
          id: barber.id,
          ...form,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      {
        success: tCommon("saved"),
        onSuccess: ({ id }) => {
          if (barber.id === null) router.replace(`/dashboard/team/${id}`);
        },
      },
    );
  }

  return (
    <form
      className="flex flex-col gap-6 pb-24 lg:pb-0"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card title={t("profile")}>
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="sm:w-44 sm:shrink-0">
            <p className="mb-2 text-sm font-medium">{t("photo")}</p>
            <ImageUpload value={form.photo} onChange={(photo) => patch({ photo })} folder="barbers" aspect="aspect-[4/5]" sizes="176px" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Field label={t("name")} htmlFor="barber-name" error={fieldError("name")}>
              <Input
                id="barber-name"
                value={form.name}
                onChange={(e) => patch({ name: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
                autoComplete="off"
                aria-invalid={!!fieldError("name")}
              />
            </Field>
            <Field label={t("slug")} htmlFor="barber-slug" hint={t("slugHint")} error={fieldError("slug")}>
              <Input
                id="barber-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  patch({ slug: e.target.value.toLowerCase() });
                }}
                autoCapitalize="none"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={!!fieldError("slug")}
              />
            </Field>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">{t("level")}</legend>
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={form.level === level}
                    onClick={() => patch({ level })}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition-colors",
                      form.level === level ? "border-accent bg-accent-soft" : "border-line-strong hover:bg-surface-2",
                    )}
                  >
                    <LevelBadge level={level} />
                    <span className="text-center text-[11px] leading-tight text-muted">{tLevels(`${level}Hint`)}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted">{t("levelHint")}</p>
            </fieldset>
            {canPickLocation ? (
              <Field label={t("location")} htmlFor="barber-location" error={fieldError("locationId")}>
                <Select id="barber-location" value={form.locationId} onChange={(e) => patch({ locationId: Number(e.target.value) })}>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {t9n(l.name, locale)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Field label={t("instagram")} htmlFor="barber-instagram" error={fieldError("instagram")}>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">@</span>
                  <Input
                    id="barber-instagram"
                    value={form.instagram}
                    onChange={(e) => patch({ instagram: e.target.value })}
                    placeholder="molodoy.barbershop"
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    className="pl-8"
                    aria-invalid={!!fieldError("instagram")}
                  />
                </div>
              </Field>
              <Field label={t("sortOrder")} htmlFor="barber-sort" error={fieldError("sortOrder")}>
                <Input
                  id="barber-sort"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => patch({ sortOrder: e.target.value })}
                  className="tabular"
                />
              </Field>
            </div>
            <Switch checked={form.active} onChange={(active) => patch({ active })} label={t("active")} description={t("activeHint")} />
          </div>
        </div>
      </Card>

      <Card title={t("bio")} actions={<LocaleTabs value={lang} onChange={setLang} errors={{ ro: hasErrorUnder("bio.ro"), ru: hasErrorUnder("bio.ru") }} />}>
        <Field label={t("bioLabel", { lang: lang.toUpperCase() })} htmlFor="barber-bio" hint={t("bioHint")} error={fieldError(`bio.${lang}`)}>
          <Textarea
            id="barber-bio"
            key={lang}
            value={form.bio[lang]}
            onChange={(e) => patch({ bio: { ...form.bio, [lang]: e.target.value } })}
            rows={5}
            lang={lang}
          />
        </Field>
      </Card>

      <Card title={t("hours")} description={t("hoursHint")}>
        <HoursEditor
          value={form.workingHours}
          onChange={(workingHours) => patch({ workingHours })}
          errorFor={(day) => fieldError(`workingHours.${day}`)}
        />
      </Card>

      <SaveBar>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("loading") : barber.id ? tCommon("save") : t("create")}
        </Button>
      </SaveBar>
    </form>
  );
}
