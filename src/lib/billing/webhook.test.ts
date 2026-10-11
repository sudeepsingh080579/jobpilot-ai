import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import { handleStripeEvent, toRecord, type BillingStore, type StripeSubscriptionLike, type SubscriptionRecord } from "@/lib/billing/webhook";

const PRICES = { price_m: "pro_monthly", price_y: "pro_annual" } as const;
const planForPrice = (id: string | null) => (id && id in PRICES ? PRICES[id as keyof typeof PRICES] : "") as "pro_monthly" | "pro_annual" | "";

function memoryStore(seed: { customers?: Record<string, string>; users?: string[] } = {}) {
  const events = new Set<string>();
  const subs = new Map<string, SubscriptionRecord>();
  const customers = new Map(Object.entries(seed.customers ?? {}));
  const users = new Set(seed.users ?? []);
  const failed: string[] = [];
  const store: BillingStore = {
    async markEvent(id) {
      if (events.has(id)) return true;
      events.add(id);
      return false;
    },
    async unmarkEvent(id) {
      events.delete(id);
    },
    async userIdForCustomer(c) {
      return customers.get(c) ?? null;
    },
    async userExists(u) {
      return users.has(u);
    },
    async upsertSubscription(r) {
      subs.set(r.userId, r);
      customers.set(r.stripeCustomerId, r.userId);
    },
    async setStatusByCustomer(c, status) {
      const u = customers.get(c);
      const r = u ? subs.get(u) : undefined;
      if (r) r.status = status;
    },
    async notifyPaymentFailed(u) {
      failed.push(u);
    },
  };
  return { store, subs, events, failed };
}

const periodEnd = Math.floor(Date.UTC(2026, 10, 11) / 1000);

function sub(overrides: Partial<StripeSubscriptionLike> = {}): StripeSubscriptionLike {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    metadata: { userId: "user_1" },
    items: { data: [{ current_period_end: periodEnd, quantity: 1, price: { id: "price_m", unit_amount: 4000, currency: "usd", recurring: { interval: "month" } } }] },
    ...overrides,
  };
}

describe("stripe webhook handler", () => {
  it("checkout.session.completed links the user and stores the subscription", async () => {
    const { store, subs } = memoryStore({ users: ["user_1"] });
    const retrieveSubscription = vi.fn(async () => sub());
    const result = await handleStripeEvent(
      { id: "evt_1", type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_1", subscription: "sub_1", client_reference_id: "user_1" } } },
      { store, stripe: { retrieveSubscription }, planForPrice },
    );
    expect(result.handled).toBe(true);
    expect(retrieveSubscription).toHaveBeenCalledWith("sub_1");
    const saved = subs.get("user_1")!;
    expect(saved).toMatchObject({ plan: "pro_monthly", status: "active", stripeCustomerId: "cus_1", stripeSubscriptionId: "sub_1", mrrCents: 4000, cancelAtPeriodEnd: false });
    expect(saved.currentPeriodEnd?.toISOString()).toBe("2026-11-11T00:00:00.000Z");
  });

  it("ignores a client_reference_id that is not a real user", async () => {
    const { store, subs } = memoryStore();
    const result = await handleStripeEvent(
      { id: "evt_x", type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_9", subscription: "sub_9", client_reference_id: "attacker" } } },
      { store, stripe: { retrieveSubscription: async () => sub() }, planForPrice },
    );
    expect(result.note).toBe("no user or subscription");
    expect(subs.size).toBe(0);
  });

  it("subscription.updated records annual plan, cancel_at_period_end and normalised MRR", async () => {
    const { store, subs } = memoryStore({ users: ["user_1"] });
    await handleStripeEvent(
      {
        id: "evt_2",
        type: "customer.subscription.updated",
        data: { object: sub({ cancel_at_period_end: true, items: { data: [{ current_period_end: periodEnd, price: { id: "price_y", unit_amount: 40000, currency: "usd", recurring: { interval: "year" } } }] } }) },
      },
      { store, stripe: { retrieveSubscription: vi.fn() }, planForPrice },
    );
    expect(subs.get("user_1")).toMatchObject({ plan: "pro_annual", cancelAtPeriodEnd: true, mrrCents: 3333 });
  });

  it("subscription.created resolves the user by customer id when metadata is missing", async () => {
    const { store, subs } = memoryStore({ customers: { cus_1: "user_1" } });
    await handleStripeEvent({ id: "evt_c", type: "customer.subscription.created", data: { object: sub({ metadata: {} }) } }, { store, stripe: { retrieveSubscription: vi.fn() }, planForPrice });
    expect(subs.get("user_1")?.status).toBe("active");
  });

  it("subscription.deleted marks canceled and zeroes MRR", async () => {
    const { store, subs } = memoryStore({ users: ["user_1"] });
    await handleStripeEvent({ id: "evt_3", type: "customer.subscription.deleted", data: { object: sub({ status: "canceled" }) } }, { store, stripe: { retrieveSubscription: vi.fn() }, planForPrice });
    expect(subs.get("user_1")).toMatchObject({ status: "canceled", mrrCents: 0 });
  });

  it("invoice.payment_failed sets past_due and notifies", async () => {
    const { store, subs, failed } = memoryStore({ users: ["user_1"] });
    await store.upsertSubscription(toRecord(sub(), "user_1", planForPrice));
    await handleStripeEvent({ id: "evt_4", type: "invoice.payment_failed", data: { object: { customer: "cus_1", hosted_invoice_url: "https://pay" } } }, { store, stripe: { retrieveSubscription: vi.fn() }, planForPrice });
    expect(subs.get("user_1")?.status).toBe("past_due");
    expect(failed).toEqual(["user_1"]);
  });

  it("is idempotent for repeated event ids and ignores unrelated events", async () => {
    const { store } = memoryStore({ users: ["user_1"] });
    const event = { id: "evt_5", type: "customer.subscription.updated", data: { object: sub() } };
    const deps = { store, stripe: { retrieveSubscription: vi.fn() }, planForPrice };
    expect((await handleStripeEvent(event, deps)).duplicate).toBeUndefined();
    expect((await handleStripeEvent(event, deps)).duplicate).toBe(true);
    expect((await handleStripeEvent({ id: "evt_6", type: "charge.refunded", data: { object: {} } }, deps)).handled).toBe(false);
  });

  it("releases the event id when processing fails so Stripe can retry", async () => {
    const { store, events } = memoryStore({ users: ["user_1"] });
    const deps = { store, stripe: { retrieveSubscription: async () => { throw new Error("stripe down"); } }, planForPrice };
    const event = { id: "evt_7", type: "checkout.session.completed", data: { object: { mode: "subscription", customer: "cus_1", subscription: "sub_1", client_reference_id: "user_1" } } };
    await expect(handleStripeEvent(event, deps)).rejects.toThrow("stripe down");
    expect(events.has("evt_7")).toBe(false);
  });

  it("only accepts correctly signed payloads (real Stripe signature check)", () => {
    const stripe = new Stripe("sk_test_dummy_for_unit_tests");
    const secret = "whsec_test_secret";
    const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "customer.subscription.updated", data: { object: sub() } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(stripe.webhooks.constructEvent(payload, header, secret).id).toBe("evt_sig");
    expect(() => stripe.webhooks.constructEvent(payload, header, "whsec_wrong")).toThrow();
    expect(() => stripe.webhooks.constructEvent(payload.replace("evt_sig", "evt_forged"), header, secret)).toThrow();
  });
});
