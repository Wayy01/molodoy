import "server-only";
import { revalidatePath } from "next/cache";

/** Public pages are prerendered; call after any dashboard change that shows up on the site. */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
