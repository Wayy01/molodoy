import { z } from "zod";
import { minutesOf } from "@/lib/time";

export const requiredText = (max: number) => z.string().trim().min(1, "required").max(max, "tooLong");
export const optionalText = (max: number) => z.string().trim().max(max, "tooLong");

export const localizedRequired = (max: number) => z.object({ ro: requiredText(max), ru: requiredText(max) });
export const localizedOptional = (max: number) => z.object({ ro: optionalText(max), ru: optionalText(max) });

export const slugSchema = z
  .string()
  .trim()
  .min(1, "required")
  .max(80, "tooLong")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalidSlug");

/** Paths handed out by /api/upload, or files shipped in /public/media. */
export const uploadPath = z.string().regex(/^\/(uploads|media)\/[\w\-./]+$/, "invalid");

export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "invalidTime");

export const weeklyHoursSchema = z
  .array(z.object({ start: timeSchema, end: timeSchema }).nullable())
  .length(7)
  .superRefine((days, ctx) => {
    days.forEach((d, i) => {
      if (d && minutesOf(d.start) >= minutesOf(d.end)) ctx.addIssue({ code: "custom", path: [i], message: "endBeforeStart" });
    });
  });

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("invalidEmail"));
export const optionalEmail = z.union([z.literal(""), emailSchema]);

export const priceSchema = z.number("invalid").int("invalid").min(0, "invalid").max(100_000, "invalid").nullable();

export const idSchema = z.number().int().positive();

/** Escapes LIKE wildcards in user input. */
export function likeTerm(input: string) {
  return `%${input.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
