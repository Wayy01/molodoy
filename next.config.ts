import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Classic ISR model: public pages are prerendered and refreshed with
  // revalidatePath() whenever the dashboard changes content.
  cacheComponents: false,
  // Lets the dev server be opened through the Tailscale HTTPS URL.
  allowedDevOrigins: ["zoro-2.tailed39ba.ts.net"],
  experimental: {
    serverActions: {
      bodySizeLimit: "12mb",
      // The app is reached through Tailscale's HTTPS proxy, whose origin differs from the local host.
      allowedOrigins: ["zoro-2.tailed39ba.ts.net:8443", "zoro-2.tailed39ba.ts.net"],
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [60, 75, 85],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
