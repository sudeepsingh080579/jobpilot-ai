/** Manual UPI payments (BILLING_PROVIDER=upi_manual). Pure helpers, no I/O. */
import { randomBytes } from "node:crypto";
import { PLAN_PRICE_PAISE } from "@/lib/billing/pricing";

type Env = Record<string, string | undefined>;

export const UPI_PERIOD_DAYS = 30;
export const UTR_RE = /^\d{12}$/;
export const REF_RE = /^JP[A-Z0-9]{8}$/;

export function upiConfig(env: Env = process.env) {
  const vpa = env.UPI_VPA?.trim() || "";
  const payeeName = env.UPI_PAYEE_NAME?.trim() || "FutureStack";
  return { vpa, payeeName, configured: /^[\w.-]+@[\w.-]+$/.test(vpa) };
}

/** Short reference shown in the UPI note so the admin can match a payment. */
export function newPaymentRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  return "JP" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function normalizeUtr(raw: string) {
  return raw.replace(/\s+/g, "");
}

export function validateUtr(raw: string): { ok: true; utr: string } | { ok: false; error: string } {
  const utr = normalizeUtr(raw);
  return UTR_RE.test(utr) ? { ok: true, utr } : { ok: false, error: "Enter the 12-digit UTR / UPI reference number from your payment app." };
}

export function amountString(paise: number) {
  return (paise / 100).toFixed(2);
}

/** NPCI UPI deep link: upi://pay?pa=&pn=&am=&cu=INR&tn= */
export function upiUri(opts: { vpa: string; payeeName: string; ref: string; amountPaise?: number }) {
  const p = new URLSearchParams({
    pa: opts.vpa,
    pn: opts.payeeName,
    am: amountString(opts.amountPaise ?? PLAN_PRICE_PAISE),
    cu: "INR",
    tn: `JobPilot ${opts.ref}`,
  });
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}

/** New paid-through date: 30 days from now, or stacked on an unexpired period. */
export function nextPeriodEnd(currentEnd: Date | null, now = new Date(), days = UPI_PERIOD_DAYS) {
  const start = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  return new Date(start.getTime() + days * 86_400_000);
}
