import { afterAll, describe, expect, it } from "vitest";

const hasDb = Boolean(process.env.DATABASE_URL?.startsWith("postgres"));

describe.skipIf(!hasDb)("billing store (database)", async () => {
  const { prisma } = await import("@/lib/prisma");
  const store = await import("@/server/billing-store");
  const tag = `bill-${Date.now()}`;
  const user = await prisma.user.create({ data: { email: `${tag}@example.com`, name: "B", passwordHash: "x" } });
  afterAll(async () => {
    await prisma.billingEventLog.deleteMany({ where: { userId: user.id } });
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("starts trial once, expires it, and processes a paid webhook exactly once", async () => {
    const t0 = new Date(Date.now() - 8 * 86_400_000);
    expect((await store.startTrial(user.id, t0)).ok).toBe(true);
    expect((await store.startTrial(user.id, new Date())).ok).toBe(false);
    expect((await store.getAccess(user.id)).allowed).toBe(false);
    await store.reconcile(user.id);
    expect((await store.getBillingSnapshot(user.id)).state).toBe("trial_expired");
    expect((await store.applyBillingEvent(user.id, { type: "CHECKOUT_STARTED" }, { provider: "razorpay", subscriptionId: `sub_${tag}` })).ok).toBe(true);
    const ev = { id: `evt_${tag}`, providerType: "subscription.charged", subscriptionId: `sub_${tag}`, customerId: null, userId: null, event: { type: "PAYMENT_SUCCEEDED" as const, paymentId: "pay_1", periodEnd: new Date(Date.now() + 30 * 86_400_000) } };
    const results = await Promise.allSettled([store.processWebhookEvent("razorpay", ev), store.processWebhookEvent("razorpay", ev), store.processWebhookEvent("razorpay", ev)]);
    const applied = results.filter((r) => r.status === "fulfilled" && !r.value.duplicate);
    expect(applied.length).toBeLessThanOrEqual(1);
    const again = await store.processWebhookEvent("razorpay", ev);
    expect(again.duplicate).toBe(true);
    const s = await store.getBillingSnapshot(user.id);
    expect(s.state).toBe("active");
    expect(s.appliedPayments).toEqual(["pay_1"]);
    expect((await store.getAccess(user.id)).paid).toBe(true);
  });
});
