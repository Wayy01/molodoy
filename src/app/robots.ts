import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "https://molodoybarbershop.md";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/dashboard", "/ru/dashboard", "/login", "/ru/login", "/booking/", "/ru/booking/", "/api/"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
