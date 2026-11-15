import type { NextRequest } from "next/server";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardContext } from "@/lib/dashboard/context";
import { exportAppointments, parseAppointmentFilters } from "@/lib/dashboard/ops/queries";
import { dateKey, timeKey } from "@/lib/time";
import { formatPhone, t9n } from "@/lib/utils";

function cell(value: string | number | null) {
  const s = value == null ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV of the appointments list with the same filters and the same scope as the page. */
export async function GET(request: NextRequest) {
  // Check first so a signed-out request gets a 401 instead of a redirect to the login page.
  if (!(await getCurrentUser())) return new Response("Unauthorized", { status: 401 });
  const ctx = await getDashboardContext();
  const sp = request.nextUrl.searchParams;
  const locale = sp.get("locale") === "ru" ? "ru" : "ro";
  const f = parseAppointmentFilters(sp);

  const [rows, t, tStatus, tSource] = await Promise.all([
    exportAppointments(ctx, f),
    getTranslations({ locale, namespace: "dashOps.list.cols" }),
    getTranslations({ locale, namespace: "common.status" }),
    getTranslations({ locale, namespace: "common.source" }),
  ]);

  const header = ["date", "time", "code", "client", "phone", "service", "barber", "branch", "price", "status", "source", "note"].map((k) => t(k));
  const lines = rows.map((a) =>
    [
      dateKey(a.startsAt),
      timeKey(a.startsAt),
      a.code,
      a.client.name,
      formatPhone(a.client.phone),
      t9n(a.service.name, locale),
      a.barber.name,
      t9n(a.location.name, locale),
      a.price,
      tStatus(a.status),
      tSource(a.source),
      a.note,
    ]
      .map(cell)
      .join(","),
  );

  // BOM so Excel opens ș/ț/Cyrillic correctly.
  const body = `﻿${[header.map(cell).join(","), ...lines].join("\r\n")}`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="molodoy-appointments-${f.from}_${f.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
