import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { CaretRight, Users } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/dashboard/shell/page-header";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientsToolbar } from "@/components/dashboard/admin/clients/clients-toolbar";
import { Pagination } from "@/components/dashboard/admin/pagination";
import { CLIENT_SORTS, listClients } from "@/lib/dashboard/admin/clients";
import { getDashboardContext } from "@/lib/dashboard/context";
import { cn, formatMDL, formatPhone } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard.nav");
  return { title: t("clients") };
}

export default async function ClientsPage({ searchParams }: PageProps<"/[locale]/dashboard/clients">) {
  const ctx = await getDashboardContext();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const sort = CLIENT_SORTS.find((s) => s === sp.sort) ?? "last";
  const page = Math.max(1, Math.floor(Number(sp.page)) || 1);

  const [{ rows, total, pages }, t, tNav, format, locale] = await Promise.all([
    listClients(ctx, { q, sort, page }),
    getTranslations("dashAdmin.clients"),
    getTranslations("dashboard.nav"),
    getFormatter(),
    getLocale(),
  ]);
  const date = (d: Date | null) => (d ? format.dateTime(d, { day: "numeric", month: "short", year: "numeric" }) : "-");
  const query: Record<string, string> = { ...(q ? { q } : {}), ...(sort !== "last" ? { sort } : {}) };

  return (
    <>
      <PageHeader
        title={tNav("clients")}
        description={ctx.barber ? t("descriptionBarber", { count: total }) : t("description", { count: total })}
      />
      <ClientsToolbar q={q} sort={sort} />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title={q ? t("emptySearch") : t("empty")}
          description={q ? t("emptySearchHint") : t("emptyHint")}
        />
      ) : (
        <>
          {/* Phones: stacked cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((c) => (
              <li key={c.id}>
                <Link href={`/dashboard/clients/${c.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 active:bg-surface-2">
                  <Avatar name={c.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="tabular truncate text-sm text-muted">{formatPhone(c.phone)}</p>
                    <p className="tabular mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-subtle">
                      <span>{t("visitsCount", { count: c.visits })}</span>
                      <span>{formatMDL(c.spent, locale)}</span>
                      {c.lastVisit ? <span>{date(c.lastVisit)}</span> : null}
                      {c.noShows ? <span className="text-danger">{t("noShowsCount", { count: c.noShows })}</span> : null}
                    </p>
                  </div>
                  <CaretRight size={18} className="shrink-0 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>

          {/* Tablet and up: table */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("col.name")}</th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell">{t("col.phone")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.visits")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.spent")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.lastVisit")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.favorite")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("col.noShows")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/clients/${c.id}`} className="flex items-center gap-3 font-medium hover:text-accent">
                        <Avatar name={c.name} size={32} />
                        <span className="min-w-0">
                          <span className="block truncate">{c.name}</span>
                          <span className="tabular block text-xs font-normal text-muted xl:hidden">{formatPhone(c.phone)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular hidden px-4 py-3 whitespace-nowrap text-muted xl:table-cell">{formatPhone(c.phone)}</td>
                    <td className="tabular px-4 py-3 text-right">{c.visits}</td>
                    <td className="tabular px-4 py-3 text-right whitespace-nowrap">{formatMDL(c.spent, locale)}</td>
                    <td className="tabular px-4 py-3 whitespace-nowrap text-muted">{date(c.lastVisit)}</td>
                    <td className="px-4 py-3 text-muted">{c.favorite ?? "-"}</td>
                    <td className={cn("tabular px-4 py-3 text-right", c.noShows ? "text-danger" : "text-subtle")}>{c.noShows}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Pagination pathname="/dashboard/clients" page={page} pages={pages} query={query} />
    </>
  );
}
