import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWhen(date: Date | string, timeZone = "UTC") {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(date));
}

export function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000);
}

export function weekKey(date = new Date()) {
  const copy = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = copy.getUTCDay() || 7;
  copy.setUTCDate(copy.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${copy.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function splitList(value: string) {
  return value
    .split(/[,|\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinList(value: string[] | undefined) {
  return (value ?? []).join(", ");
}

/** Locale-aware money formatting. Defaults to USD; any ISO currency works (INR shows ₹ with lakh grouping). */
export function formatMoney(amount: number, currency = "USD", locale?: string) {
  const code = currency.toUpperCase();
  const loc = locale ?? (code === "INR" ? "en-IN" : "en-US");
  return new Intl.NumberFormat(loc, { style: "currency", currency: code, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
}
