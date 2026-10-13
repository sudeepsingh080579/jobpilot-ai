import { createHmac, timingSafeEqual } from "node:crypto";
import type { BillingProvider, CheckoutRequest, CheckoutSession, NormalizedEvent } from "@/lib/billing/providers/types";
import { BillingNotConfiguredError } from "@/lib/billing/providers/types";

type Env = Record<string, string | undefined>;

export function razorpayConfig(env: Env = process.env) {
  const keyId = env.RAZORPAY_KEY_ID?.trim() || "";
  const keySecret = env.RAZORPAY_KEY_SECRET?.trim() || "";
  const webhookSecret = env.RAZORPAY_WEBHOOK_SECRET?.trim() || "";
  const planMonthly = env.RAZORPAY_PLAN_MONTHLY?.trim() || "";
  return { keyId, keySecret, webhookSecret, planMonthly, configured: Boolean(keyId && keySecret && planMonthly), webhookConfigured: Boolean(webhookSecret) };
}

export function hmacHex(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout.js success handler signature: HMAC(key_secret, payment_id|subscription_id). */
export function verifyCheckoutSignature(keySecret: string, paymentId: string, subscriptionId: string, signature: string) {
  if (!keySecret || !signature) return false;
  return safeEqualHex(hmacHex(keySecret, `${paymentId}|${subscriptionId}`), signature);
}

type RzSub = { id: string; customer_id?: string | null; status: string; current_end?: number | null; notes?: Record<string, string> };
type RzPayload = { event: string; payload?: { subscription?: { entity: RzSub }; payment?: { entity: { id: string } } } };

/** Razorpay webhook → BillingEvent. Unknown events map to null (acknowledged, ignored). */
export function mapRazorpayEvent(body: RzPayload, eventId: string | null): NormalizedEvent {
  const sub = body.payload?.subscription?.entity;
  const payment = body.payload?.payment?.entity;
  const periodEnd = sub?.current_end ? new Date(sub.current_end * 1000) : null;
  let event: NormalizedEvent["event"] = null;
  switch (body.event) {
    case "subscription.charged":
      if (payment?.id && periodEnd) event = { type: "PAYMENT_SUCCEEDED", paymentId: payment.id, periodEnd };
      break;
    case "subscription.pending":
      event = { type: "PAYMENT_FAILED" };
      break;
    case "subscription.halted":
      event = { type: "RETRIES_EXHAUSTED" };
      break;
    case "subscription.cancelled":
    case "subscription.completed":
      event = { type: "CANCEL_REQUESTED", atPeriodEnd: false };
      break;
  }
  return {
    // Razorpay sends x-razorpay-event-id; fall back to a deterministic key.
    id: eventId || `${body.event}:${sub?.id ?? ""}:${payment?.id ?? ""}:${sub?.current_end ?? ""}`,
    providerType: body.event,
    subscriptionId: sub?.id ?? null,
    customerId: sub?.customer_id ?? null,
    userId: sub?.notes?.userId ?? null,
    event,
  };
}

export function createRazorpayProvider(env: Env = process.env, fetchImpl: typeof fetch = fetch): BillingProvider {
  const cfg = () => razorpayConfig(env);
  async function api<T>(path: string, init: { method: string; body?: unknown }): Promise<T> {
    const c = cfg();
    const res = await fetchImpl(`https://api.razorpay.com/v1${path}`, {
      method: init.method,
      headers: { "Content-Type": "application/json", Authorization: `Basic ${Buffer.from(`${c.keyId}:${c.keySecret}`).toString("base64")}` },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });
    if (!res.ok) throw new Error(`Razorpay ${path} failed with ${res.status}`);
    return (await res.json()) as T;
  }
  return {
    id: "razorpay",
    configured: () => cfg().configured,
    async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
      const c = cfg();
      if (!c.configured) throw new BillingNotConfiguredError("razorpay");
      // 120 monthly cycles = open-ended; user cancels any time. notes.userId links webhooks back.
      const sub = await api<RzSub>("/subscriptions", {
        method: "POST",
        body: { plan_id: c.planMonthly, total_count: 120, quantity: 1, customer_notify: true, notes: { userId: req.userId, plan: req.plan } },
      });
      return { kind: "razorpay_modal", keyId: c.keyId, subscriptionId: sub.id };
    },
    async cancel(subscriptionId: string, atPeriodEnd: boolean) {
      if (!cfg().configured) throw new BillingNotConfiguredError("razorpay");
      await api(`/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, { method: "POST", body: { cancel_at_cycle_end: atPeriodEnd ? 1 : 0 } });
    },
    verifyWebhook(rawBody: string, signature: string | null) {
      const { webhookSecret } = cfg();
      if (!webhookSecret || !signature) return false;
      return safeEqualHex(hmacHex(webhookSecret, rawBody), signature);
    },
    parseWebhook(rawBody: string, eventId: string | null) {
      return mapRazorpayEvent(JSON.parse(rawBody) as RzPayload, eventId);
    },
  };
}
