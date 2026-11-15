import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, CalendarPlus, CheckCircle, MapTrifold, XCircle } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { LevelBadge } from "@/components/ui/badge";
import { CANCEL_CUTOFF_MS, getBookingByCode } from "@/lib/booking/queries";
import { timeKey } from "@/lib/time";
import { formatMDL, formatPhone, priceFor, t9n } from "@/lib/utils";
import { CancelButton } from "./cancel-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/booking/[code]">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "booking" });
  return { title: t("meta"), robots: { index: false } };
}

function bookingState(a: { status: string; startsAt: Date; endsAt: Date }) {
  const now = Date.now();
  return {
    cancelled: a.status === "cancelled",
    past: a.endsAt.getTime() < now,
    canCancel: a.status === "booked" && a.startsAt.getTime() - now >= CANCEL_CUTOFF_MS,
  };
}

export default async function BookingPage({ params }: PageProps<"/[locale]/booking/[code]">) {
  const { locale, code } = await params;
  setRequestLocale(locale);
  const row = await getBookingByCode(code);
  if (!row) notFound();

  const t = await getTranslations("booking");
  const format = await getFormatter();
  const { appointment: a, barber, service, location, client } = row;
  const { cancelled, past, canCancel } = bookingState(a);
  const tierPrice = priceFor(service, barber.level);
  const firstName = client.name.split(" ")[0];

  return (
    <div className="container-x max-w-3xl pt-28 pb-20 sm:pt-32">
      <div className="flex items-center gap-3">
        {cancelled ? <XCircle size={36} className="text-danger" weight="fill" /> : <CheckCircle size={36} className="text-success" weight="fill" />}
      </div>
      <h1 className="display mt-5 text-[clamp(2rem,6vw,3.5rem)] leading-[1.05]">{cancelled ? t("done.cancelled") : t("done.title", { name: firstName })}</h1>
      <p className="mt-3 text-lg text-muted">{cancelled ? t("done.cancelledSub") : past ? t("done.past") : t("done.sub")}</p>

      <div className="mt-10 overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="flex items-center gap-4 border-b border-line p-5 sm:p-6">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-surface-3">
            {barber.photo && <Image src={barber.photo} alt="" fill sizes="64px" className="object-cover" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 font-display text-lg font-semibold">
              {barber.name} <LevelBadge level={barber.level} />
            </p>
            <p className="text-sm text-muted">{t9n(service.name, locale)}</p>
          </div>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface p-5 sm:p-6">
            <dt className="text-sm text-muted">{t("summary.when")}</dt>
            <dd className={`mt-1 font-display text-xl font-semibold ${cancelled ? "line-through opacity-50" : ""}`}>
              {format.dateTime(a.startsAt, { weekday: "long", day: "numeric", month: "long" })}
              <span className="tabular block text-accent">{timeKey(a.startsAt)}</span>
            </dd>
          </div>
          <div className="bg-surface p-5 sm:p-6">
            <dt className="text-sm text-muted">{t("summary.location")}</dt>
            <dd className="mt-1">
              <span className="font-display text-xl font-semibold">{t9n(location.name, locale)}</span>
              <span className="block text-sm text-muted">{t9n(location.address, locale)}</span>
            </dd>
          </div>
          <div className="bg-surface p-5 sm:p-6">
            <dt className="text-sm text-muted">{t("summary.total")}</dt>
            <dd className="tabular mt-1 font-display text-xl font-semibold">
              {formatMDL(a.price, locale)}
              {tierPrice != null && a.price < tierPrice && <span className="mt-1 block font-sans text-sm font-normal text-success">{t("done.discount")}</span>}
            </dd>
          </div>
          <div className="bg-surface p-5 sm:p-6">
            <dt className="text-sm text-muted">{t("done.code")}</dt>
            <dd className="tabular mt-1 font-mono text-xl tracking-[0.15em]">{a.code}</dd>
          </div>
        </dl>
      </div>

      {!cancelled && !past && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a href={`/api/booking/${a.code}/ics?locale=${locale}`} className={buttonVariants({ size: "lg", variant: "inverse" })}>
            <CalendarPlus size={20} /> {t("done.addToCalendar")}
          </a>
          {location.mapLink && (
            <a href={location.mapLink} target="_blank" rel="noreferrer" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              <MapTrifold size={20} /> {t("done.directions")}
            </a>
          )}
        </div>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <Link href="/book" className="inline-flex items-center gap-2 font-medium hover:text-accent">
          {t("done.bookAnother")} <ArrowRight size={16} />
        </Link>
        {canCancel ? (
          <CancelButton code={a.code} phone={formatPhone(location.phone)} />
        ) : a.status === "booked" && !past ? (
          <p className="text-sm text-muted">{t("done.tooLate", { phone: formatPhone(location.phone) })}</p>
        ) : null}
      </div>
    </div>
  );
}
