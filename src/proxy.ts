import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API routes, uploaded media, Next internals and any path with a file extension.
  matcher: "/((?!api|uploads|_next|_vercel|.*\\..*).*)",
};
