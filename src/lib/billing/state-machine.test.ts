import { describe, expect, it } from "vitest";
import { accessFor, initialSnapshot, stateFromProvider, transition, type Snapshot } from "@/lib/billing/state-machine";
import { formatInr, priceBreakdown } from "@/lib/billing/pricing";
import { createRazorpayProvider, hmacHex, mapRazorpayEvent, verifyCheckoutSignature } from "@/lib/billing/providers/razorpay";

const day = 86_400_000;
const t0 = new Date("2026-10-13T00:00:00Z");
const step = (s: Snapshot, e: Parameters<typeof transition>[1]) => {
  const r = transition(s, e);
  if (!r.ok) throw new Error(r.error);
  return r.snapshot;
};

describe("pricing", () => {
  it("₹1,999 incl. 18% GST = ₹1,694.07 + ₹304.93 in paise", () => {
    expect(priceBreakdown()).toEqual({ currency: "INR", basePaise: 169407, gstRateBps: 1800, gstPaise: 30493, totalPaise: 199900 });
    expect(formatInr(199900)).toBe("₹1,999");
    expect(formatInr(169407)).toBe("₹1,694.07");
    expect(formatInr(30493)).toBe("₹304.93");
  });
});

describe("subscription state machine", () => {
  it("7-day trial grants access then expires; trial only once", () => {
    let s = step(initialSnapshot(), { type: "TRIAL_STARTED", at: t0, days: 7 });
    expect(accessFor(s, new Date(t0.getTime() + 6 * day)).allowed).toBe(true);
    expect(accessFor(s, new Date(t0.getTime() + 7 * day + 1)).allowed).toBe(false);
    s = step(s, { type: "TRIAL_ENDED" });
    expect(s.state).toBe("trial_expired");
    expect(transition(s, { type: "TRIAL_STARTED", at: t0, days: 7 }).ok).toBe(false);
  });
  it("no automatic charge: expired trial needs an explicit checkout before payment", () => {
    let s = step(step(initialSnapshot(), { type: "TRIAL_STARTED", at: t0, days: 7 }), { type: "TRIAL_ENDED" });
    s = step(s, { type: "CHECKOUT_STARTED" });
    expect(s.state).toBe("pending_payment");
    s = step(s, { type: "PAYMENT_SUCCEEDED", paymentId: "pay_1", periodEnd: new Date(t0.getTime() + 37 * day) });
    expect(s.state).toBe("active");
    expect(accessFor(s, new Date(t0.getTime() + 20 * day)).paid).toBe(true);
  });
  it("same payment twice is idempotent; non-extending payment rejected", () => {
    let s = step(initialSnapshot(), { type: "CHECKOUT_STARTED" });
    const end = new Date(t0.getTime() + 30 * day);
    s = step(s, { type: "PAYMENT_SUCCEEDED", paymentId: "pay_1", periodEnd: end });
    const again = transition(s, { type: "PAYMENT_SUCCEEDED", paymentId: "pay_1", periodEnd: end });
    expect(again.ok && again.changed).toBe(false);
    expect(transition(s, { type: "PAYMENT_SUCCEEDED", paymentId: "pay_2", periodEnd: end }).ok).toBe(false);
  });
  it("blocks a second concurrent subscription", () => {
    let s = step(initialSnapshot(), { type: "CHECKOUT_STARTED" });
    s = step(s, { type: "PAYMENT_SUCCEEDED", paymentId: "p", periodEnd: new Date(t0.getTime() + 30 * day) });
    expect(transition(s, { type: "CHECKOUT_STARTED" }).ok).toBe(false);
  });
  it("past_due grace, then halted removes access", () => {
    let s = step(initialSnapshot(), { type: "CHECKOUT_STARTED" });
    const end = new Date(t0.getTime() + 30 * day);
    s = step(s, { type: "PAYMENT_SUCCEEDED", paymentId: "p", periodEnd: end });
    s = step(s, { type: "PAYMENT_FAILED" });
    expect(accessFor(s, new Date(end.getTime() + day)).allowed).toBe(true);
    expect(accessFor(s, new Date(end.getTime() + 4 * day)).allowed).toBe(false);
    s = step(s, { type: "RETRIES_EXHAUSTED" });
    expect(accessFor(s, t0).allowed).toBe(false);
  });
  it("cancel at period end keeps access until periodEnd", () => {
    let s = step(initialSnapshot(), { type: "CHECKOUT_STARTED" });
    const end = new Date(t0.getTime() + 30 * day);
    s = step(s, { type: "PAYMENT_SUCCEEDED", paymentId: "p", periodEnd: end });
    s = step(s, { type: "CANCEL_REQUESTED", atPeriodEnd: true });
    expect(accessFor(s, new Date(end.getTime() - day)).allowed).toBe(true);
    s = step(s, { type: "PERIOD_ENDED" });
    expect(s.state).toBe("cancelled");
    expect(accessFor(s, t0).allowed).toBe(false);
  });
  it("maps provider statuses", () => {
    expect(stateFromProvider("razorpay", "halted")).toBe("halted");
    expect(stateFromProvider("razorpay", "active", true)).toBe("cancel_scheduled");
    expect(stateFromProvider("stripe", "past_due")).toBe("past_due");
  });
});

describe("razorpay adapter", () => {
  const env = { RAZORPAY_KEY_ID: "rzp_test_x", RAZORPAY_KEY_SECRET: "sec", RAZORPAY_WEBHOOK_SECRET: "whsec", RAZORPAY_PLAN_MONTHLY: "plan_1" };
  it("verifies webhook signatures and rejects tampering", () => {
    const p = createRazorpayProvider(env);
    const body = JSON.stringify({ event: "subscription.charged" });
    expect(p.verifyWebhook(body, hmacHex("whsec", body))).toBe(true);
    expect(p.verifyWebhook(body + " ", hmacHex("whsec", body))).toBe(false);
    expect(p.verifyWebhook(body, null)).toBe(false);
    expect(createRazorpayProvider({}).verifyWebhook(body, hmacHex("", body))).toBe(false);
  });
  it("verifies checkout signature", () => {
    expect(verifyCheckoutSignature("sec", "pay_1", "sub_1", hmacHex("sec", "pay_1|sub_1"))).toBe(true);
    expect(verifyCheckoutSignature("sec", "pay_1", "sub_2", hmacHex("sec", "pay_1|sub_1"))).toBe(false);
  });
  it("maps subscription.charged to PAYMENT_SUCCEEDED", () => {
    const ev = mapRazorpayEvent({ event: "subscription.charged", payload: { subscription: { entity: { id: "sub_1", status: "active", current_end: 1_800_000_000, notes: { userId: "u1" } } }, payment: { entity: { id: "pay_9" } } } }, "evt_1");
    expect(ev).toMatchObject({ id: "evt_1", userId: "u1", subscriptionId: "sub_1", event: { type: "PAYMENT_SUCCEEDED", paymentId: "pay_9" } });
  });
  it("is not configured without keys and refuses checkout", async () => {
    const p = createRazorpayProvider({});
    expect(p.configured()).toBe(false);
    await expect(p.createCheckout({ userId: "u", email: "e", name: "n", plan: "pro_monthly" })).rejects.toThrow(/not configured/);
  });
  it("creates a subscription via the API with userId in notes", async () => {
    let sent: unknown;
    const fake = (async (_u: string, init: RequestInit) => { sent = JSON.parse(String(init.body)); return new Response(JSON.stringify({ id: "sub_new", status: "created" })); }) as unknown as typeof fetch;
    const out = await createRazorpayProvider(env, fake).createCheckout({ userId: "u1", email: "e", name: "n", plan: "pro_monthly" });
    expect(out).toEqual({ kind: "razorpay_modal", keyId: "rzp_test_x", subscriptionId: "sub_new" });
    expect(sent).toMatchObject({ plan_id: "plan_1", notes: { userId: "u1" } });
  });
});
