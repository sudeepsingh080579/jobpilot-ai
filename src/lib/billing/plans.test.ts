import { describe, expect, it } from "vitest";
import { checkAi, entitlementFor, hasFeature, LIMITS, monthlyCents, PRICES, usagePeriod } from "@/lib/billing/plans";
import { planForPrice, stripeConfig } from "@/lib/billing/config";

const now = new Date("2026-10-11T12:00:00Z");
const days = (n: number) => new Date(now.getTime() + n * 86400000);
const active = (over: Partial<{ status: string; plan: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }> = {}) => ({
  status: "active",
  plan: "pro_monthly",
  currentPeriodEnd: days(20),
  cancelAtPeriodEnd: false,
  ...over,
});

describe("entitlements", () => {
  it("prices are $40/month and $400/year", () => {
    expect(PRICES.pro_monthly).toMatchObject({ amountUsd: 40, interval: "month" });
    expect(PRICES.pro_annual).toMatchObject({ amountUsd: 400, interval: "year" });
  });

  it("new accounts are on a 7-day trial with Pro features", () => {
    const ent = entitlementFor({ trialEndsAt: days(7), subscription: null }, now);
    expect(ent.plan).toBe("trial");
    expect(ent.trialDaysLeft).toBe(7);
    expect(hasFeature(ent, "pitch_deck")).toBe(true);
  });

  it("expired trial falls back to Free, not lockout", () => {
    const ent = entitlementFor({ trialEndsAt: days(-1), subscription: null }, now);
    expect(ent.plan).toBe("free");
    expect(ent.aiPerMonth).toBe(LIMITS.free.aiPerMonth);
    expect(hasFeature(ent, "pitch_deck")).toBe(false);
    expect(hasFeature(ent, "cover_letter")).toBe(true);
  });

  it("active, trialing and past_due subscriptions grant Pro", () => {
    for (const status of ["active", "trialing", "past_due"]) {
      expect(entitlementFor({ trialEndsAt: null, subscription: active({ status }) }, now).plan).toBe("pro");
    }
  });

  it("canceled, unpaid and incomplete subscriptions do not", () => {
    for (const status of ["canceled", "unpaid", "incomplete", "incomplete_expired", "paused"]) {
      expect(entitlementFor({ trialEndsAt: null, subscription: active({ status }) }, now).plan).toBe("free");
    }
  });

  it("cancel_at_period_end keeps Pro until the period ends", () => {
    const ent = entitlementFor({ trialEndsAt: null, subscription: active({ cancelAtPeriodEnd: true, plan: "pro_annual" }) }, now);
    expect(ent).toMatchObject({ plan: "pro", paidPlan: "pro_annual", cancelAtPeriodEnd: true });
  });

  it("a stale active record long past its period end does not grant Pro", () => {
    expect(entitlementFor({ trialEndsAt: null, subscription: active({ currentPeriodEnd: days(-10) }) }, now).plan).toBe("free");
  });

  it("checkAi blocks Pro-only tasks on Free and enforces the monthly quota", () => {
    const free = entitlementFor({ trialEndsAt: null, subscription: null }, now);
    expect(checkAi(free, "pitch_deck", 0)).toMatchObject({ ok: false, reason: "feature" });
    expect(checkAi(free, "cover_letter", 0)).toEqual({ ok: true });
    expect(checkAi(free, "cover_letter", LIMITS.free.aiPerMonth)).toMatchObject({ ok: false, reason: "quota" });
    const pro = entitlementFor({ trialEndsAt: null, subscription: active() }, now);
    expect(checkAi(pro, "pitch_deck", LIMITS.pro.aiPerMonth - 1)).toEqual({ ok: true });
    expect(checkAi(pro, "chat", LIMITS.pro.aiPerMonth)).toMatchObject({ ok: false, reason: "quota" });
  });

  it("usage period is the UTC calendar month", () => {
    expect(usagePeriod(new Date("2026-01-31T23:59:59Z"))).toBe("2026-01");
    expect(usagePeriod(new Date("2026-12-01T00:00:00Z"))).toBe("2026-12");
  });

  it("MRR normalises annual prices", () => {
    expect(monthlyCents(4000, "month")).toBe(4000);
    expect(monthlyCents(40000, "year")).toBe(3333);
  });

  it("stripe config reports not configured without keys and maps price ids", () => {
    expect(stripeConfig({}).configured).toBe(false);
    const env = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_PRICE_MONTHLY: "price_m", STRIPE_PRICE_YEARLY: "price_y" };
    expect(stripeConfig(env).configured).toBe(true);
    expect(stripeConfig(env).webhookConfigured).toBe(false);
    expect(planForPrice("price_y", env)).toBe("pro_annual");
    expect(planForPrice("price_other", env)).toBe("");
  });
});
