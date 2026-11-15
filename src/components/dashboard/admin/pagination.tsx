import { getTranslations } from "next-intl/server";
import { CaretLeft, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Prev / next links that keep the other query params. */
export async function Pagination({
  pathname,
  page,
  pages,
  query,
}: {
  pathname: string;
  page: number;
  pages: number;
  query: Record<string, string>;
}) {
  if (pages <= 1) return null;
  const t = await getTranslations("dashboard.common");
  const href = (p: number) => ({ pathname, query: p > 1 ? { ...query, page: String(p) } : query });
  const disabled = "pointer-events-none opacity-40";

  return (
    <nav className="mt-6 flex items-center justify-between gap-3" aria-label="Pagination">
      <Link
        href={href(page - 1)}
        aria-disabled={page <= 1}
        className={buttonVariants({ variant: "secondary", className: cn(page <= 1 && disabled) })}
      >
        <CaretLeft size={16} />
        {t("previous")}
      </Link>
      <span className="tabular text-sm text-muted">{t("page", { page, total: pages })}</span>
      <Link
        href={href(page + 1)}
        aria-disabled={page >= pages}
        className={buttonVariants({ variant: "secondary", className: cn(page >= pages && disabled) })}
      >
        {t("next")}
        <CaretRight size={16} />
      </Link>
    </nav>
  );
}
