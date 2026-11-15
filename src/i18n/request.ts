import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// One file per area so the site and dashboard copy can be edited independently.
const NAMESPACES = ["common", "site", "booking", "dashboard", "dashOps", "dashAdmin"] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const parts = await Promise.all(
    NAMESPACES.map(async (ns) => [ns, (await import(`../../messages/${locale}/${ns}.json`)).default] as const),
  );
  return {
    locale,
    timeZone: "Europe/Chisinau",
    messages: Object.fromEntries(parts),
  };
});
