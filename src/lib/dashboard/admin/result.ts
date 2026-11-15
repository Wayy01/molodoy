import type { z } from "zod";

/** Field path ("bio.ro", "hours.3") -> error code; codes are keys under `dashAdmin.errors`. */
export type FieldErrors = Record<string, string>;

export type Result<T = null> = { ok: true; data: T } | { ok: false; error: string; fields?: FieldErrors };

export function ok(): Result<null>;
export function ok<T>(data: T): Result<T>;
export function ok<T>(data?: T): Result<T | null> {
  return { ok: true, data: data ?? null };
}

export function fail(error: string, fields?: FieldErrors): { ok: false; error: string; fields?: FieldErrors } {
  return { ok: false, error, fields };
}

/** Zod messages are error codes, so the client can translate them. The first issue per field wins. */
export function invalid(error: z.ZodError) {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    fields[key] ??= /^[a-zA-Z]+$/.test(issue.message) ? issue.message : "invalid";
  }
  return fail("invalid", fields);
}
