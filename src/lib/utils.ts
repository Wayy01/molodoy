import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BarberLevel, Localized, Service } from "@/db/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function t9n(value: Localized | null | undefined, locale: string): string {
  if (!value) return "";
  return value[locale as keyof Localized] || value.ro || value.ru || "";
}

export function formatMDL(amount: number, locale: string) {
  return `${new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "ro-MD").format(amount)} MDL`;
}

export function priceFor(service: Pick<Service, "priceBarber" | "pricePro" | "priceTop">, level: BarberLevel) {
  if (level === "top") return service.priceTop;
  if (level === "pro") return service.pricePro;
  return service.priceBarber;
}

/** Lowest and highest price across tiers that offer the service. */
export function priceRange(service: Pick<Service, "priceBarber" | "pricePro" | "priceTop">) {
  const prices = [service.priceBarber, service.pricePro, service.priceTop].filter((p): p is number => p != null);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Moldovan numbers are stored as +373XXXXXXXX so "069..." and "+373 69..." match the same client. */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("373")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 9) return `+373${digits.slice(1)}`;
  if (digits.length === 8) return `+373${digits}`;
  return `+${digits}`;
}

export function formatPhone(phone: string) {
  const m = phone.match(/^\+373(\d{2})(\d{3})(\d{3})$/);
  return m ? `+373 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

export function slugify(input: string) {
  const map: Record<string, string> = {
    ă: "a", â: "a", î: "i", ș: "s", ş: "s", ț: "t", ţ: "t",
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
    х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya", ь: "", ъ: "",
  };
  return input
    .toLowerCase()
    .split("")
    .map((c) => map[c] ?? c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function bookingCode(length = 10) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
