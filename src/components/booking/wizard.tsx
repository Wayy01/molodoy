"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowLeft } from "@phosphor-icons/react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { gsap, MOTION_OK, useGSAP } from "@/components/motion/gsap";
import { createBooking } from "@/lib/booking/actions";
import { cn, formatMDL, t9n } from "@/lib/utils";
import { StepLocation } from "./step-location";
import { StepBarber } from "./step-barber";
import { StepService } from "./step-service";
import { StepTime } from "./step-time";
import { DETAILS_FORM_ID, StepDetails, type DetailsField, type DetailsValues } from "./step-details";
import { Summary } from "./summary";
import { STEPS, type BookingBarber, type BookingLocation, type BookingService, type Step } from "./types";
import { useWhenLabel } from "./use-when-label";

export function BookingWizard({
  locations,
  barbers,
  services,
  discount,
}: {
  locations: BookingLocation[];
  barbers: BookingBarber[];
  services: BookingService[];
  discount: number;
}) {
  const t = useTranslations("booking");
  const tl = useTranslations("common.levels");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const when = useWhenLabel();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<DetailsField[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const stepRef = useRef<HTMLDivElement>(null);

  // Every choice lives in the URL, so refresh, sharing and the phone's back button all just work.
  const pickedBarber = barbers.find((b) => b.slug === params.get("barber"));
  const location =
    locations.find((l) => l.slug === params.get("location")) ?? (pickedBarber ? locations.find((l) => l.id === pickedBarber.locationId) : undefined);
  const barber = pickedBarber && location && pickedBarber.locationId === location.id ? pickedBarber : undefined;
  const pickedService = services.find((s) => s.slug === params.get("service"));
  const service = pickedService && barber && pickedService.prices[barber.level] != null ? pickedService : undefined;
  const date = service ? (params.get("date") ?? undefined) : undefined;
  const time = date ? (params.get("time") ?? undefined) : undefined;
  const price = service && barber ? service.prices[barber.level] : null;

  const firstOpen: Step = !location ? "location" : !barber ? "barber" : !service ? "service" : !(date && time) ? "time" : "details";
  const requested = params.get("step") as Step | null;
  const step: Step = requested && STEPS.includes(requested) && STEPS.indexOf(requested) <= STEPS.indexOf(firstOpen) ? requested : firstOpen;
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.from(stepRef.current!.children, { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.04, ease: "expo.out" });
      });
      return () => mm.revert();
    },
    { dependencies: [step], scope: stepRef },
  );

  function go(patch: Record<string, string | null>, next: Step) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v == null) q.delete(k);
      else q.set(k, v);
    }
    q.set("step", next);
    router.push(`/book?${q.toString()}`, { scroll: false });
  }

  function back() {
    go({}, STEPS[Math.max(0, stepIndex - 1)]);
  }

  function submit(values: DetailsValues) {
    if (!barber || !service || !date || !time) return;
    start(async () => {
      const res = await createBooking({ barberId: barber.id, serviceId: service.id, date, time, ...values });
      if (res.ok) {
        router.push(`/booking/${res.code}`);
        return;
      }
      if (res.error === "slot_taken") {
        toast.error(t("errors.slotTaken"));
        setRefreshKey((k) => k + 1);
        go({ time: null }, "time");
      } else if (res.error === "invalid" && res.fields?.length) {
        setErrors(res.fields);
      } else {
        toast.error(t("errors.generic"));
      }
    });
  }

  const haircut = services.find((s) => s.category === "hair");
  const teamHere = location ? barbers.filter((b) => b.locationId === location.id) : [];

  return (
    <div className="container-x pt-24 pb-44 sm:pt-28 lg:pb-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-16">
        <div className="min-w-0">
          <ol className="grid grid-cols-5 gap-1.5" aria-label={t("title")}>
            {STEPS.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  disabled={i > STEPS.indexOf(firstOpen)}
                  onClick={() => go({}, s)}
                  className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
                  aria-current={s === step ? "step" : undefined}
                >
                  <span className={cn("h-1 rounded-full transition-colors duration-500", i < stepIndex ? "bg-fg" : i === stepIndex ? "bg-accent" : "bg-line-strong")} />
                  <span className={cn("hidden text-xs sm:block", i === stepIndex ? "text-fg" : "text-subtle")}>{t(`steps.${s}`)}</span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-start gap-3 sm:mt-10">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={back}
                aria-label={t("nav.back")}
                className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line-strong transition-colors hover:border-fg sm:mt-1.5"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div>
              <h1 className="display text-[clamp(1.9rem,5vw,3.25rem)] leading-[1.05]">{t(`${step}.title`)}</h1>
              {step === "service" && barber && (
                <p className="mt-2 text-muted">{t("service.with", { name: barber.name, level: tl(barber.level) })}</p>
              )}
            </div>
          </div>

          <div ref={stepRef} key={step} className="mt-8">
            {step === "location" && (
              <StepLocation locations={locations} value={location?.id} onPick={(id) => go({ location: locations.find((l) => l.id === id)!.slug, barber: null, date: null, time: null }, "barber")} />
            )}
            {step === "barber" && location && (
              <StepBarber
                barbers={teamHere}
                locationId={location.id}
                value={barber?.id}
                fromPrice={(b) => (haircut ? haircut.prices[b.level] : null)}
                onPick={(id) => {
                  const b = barbers.find((x) => x.id === id)!;
                  const keepService = pickedService && pickedService.prices[b.level] != null;
                  go({ barber: b.slug, date: null, time: null }, keepService ? "time" : "service");
                }}
              />
            )}
            {step === "service" && barber && (
              <StepService
                services={services}
                level={barber.level}
                value={service?.id}
                onPick={(id) => go({ service: services.find((s) => s.id === id)!.slug, date: null, time: null }, "time")}
              />
            )}
            {step === "time" && barber && service && (
              <StepTime
                barberId={barber.id}
                barberName={barber.name}
                serviceId={service.id}
                date={date}
                time={time}
                refreshKey={refreshKey}
                onPick={(d, tm) => go({ date: d, time: tm }, "details")}
              />
            )}
            {step === "details" && (
              <StepDetails discount={service?.category === "hair" ? discount : 0} pending={pending} errors={errors} onSubmit={submit} />
            )}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <Summary location={location} barber={barber} service={service} date={date} time={time} price={price} onEdit={(s) => go({}, s)} />
          </div>
        </aside>
      </div>

      {location && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
          <div className="container-x flex items-center gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {[t9n(location.name, locale), barber?.name, service && t9n(service.name, locale)].filter(Boolean).join(", ")}
              </p>
              <p className="tabular truncate text-xs text-muted">
                {date && time ? when(date, time) : t(`steps.${step}`)}
                {price != null && <span className="text-fg">{`  ${formatMDL(price, locale)}`}</span>}
              </p>
            </div>
            {step === "details" && (
              <Button type="submit" form={DETAILS_FORM_ID} disabled={pending} className="h-12 px-6">
                {pending ? t("details.submitting") : t("details.submit")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
