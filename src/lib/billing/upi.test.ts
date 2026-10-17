import { describe, expect, it } from "vitest";
import { activeProviderId, getBillingProvider } from "@/lib/billing/providers";
import { newPaymentRef, nextPeriodEnd, REF_RE, upiConfig, upiUri, validateUtr } from "@/lib/billing/upi";
import { initialSnapshot, transition } from "@/lib/billing/state-machine";

describe("upi_manual provider", () => {
  it("is selected by BILLING_PROVIDER=upi_manual and needs a VPA", () => {
    expect(activeProviderId({ BILLING_PROVIDER: "upi_manual" })).toBe("upi_manual");
    expect(getBillingProvider({ BILLING_PROVIDER: "upi_manual" }).configured()).toBe(false);
    expect(getBillingProvider({ BILLING_PROVIDER: "upi_manual", UPI_VPA: "apex-voyager-1979@yescred" }).configured()).toBe(true);
    expect(upiConfig({}).payeeName).toBe("FutureStack");
  });
  it("builds the UPI deep link with exact amount", () => {
    const uri = upiUri({ vpa: "apex-voyager-1979@yescred", payeeName: "FutureStack", ref: "JPABCDEFGH" });
    expect(uri).toBe("upi://pay?pa=apex-voyager-1979%40yescred&pn=FutureStack&am=1999.00&cu=INR&tn=JobPilot%20JPABCDEFGH");
  });
  it("validates 12-digit UTRs", () => {
    expect(validateUtr("4123 4567 8901")).toEqual({ ok: true, utr: "412345678901" });
    expect(validateUtr("12345").ok).toBe(false);
    expect(validateUtr("41234567890a").ok).toBe(false);
  });
  it("refs match format", () => {
    for (let i = 0; i < 20; i++) expect(newPaymentRef()).toMatch(REF_RE);
  });
  it("30-day period stacks on unexpired period", () => {
    const now = new Date("2026-10-17T00:00:00Z");
    expect(nextPeriodEnd(null, now).toISOString()).toBe("2026-11-16T00:00:00.000Z");
    expect(nextPeriodEnd(new Date("2026-10-20T00:00:00Z"), now).toISOString()).toBe("2026-11-19T00:00:00.000Z");
  });
  it("approval through the state machine is idempotent; cancel keeps access until period end", () => {
    const trial = transition(initialSnapshot(), { type: "TRIAL_STARTED", at: new Date(), days: 7 }).snapshot;
    const ev = { type: "PAYMENT_SUCCEEDED", paymentId: "upi:x", periodEnd: new Date(Date.now() + 30 * 864e5) } as const;
    const a = transition(trial, ev);
    expect(a.ok && a.snapshot.state).toBe("active");
    const b = transition(a.snapshot, ev);
    expect(b.ok && !b.changed).toBe(true);
    const c = transition(a.snapshot, { type: "CANCEL_REQUESTED", atPeriodEnd: true });
    expect(c.ok && c.snapshot.state).toBe("cancel_scheduled");
  });
});

describe("instant activation copy and notify config", () => {
  it("defaults admin notifications to futurestacklearning@gmail.com", async () => {
    const { adminNotifyEmail } = await import("@/server/upi-store");
    expect(adminNotifyEmail({})).toBe("futurestacklearning@gmail.com");
    expect(adminNotifyEmail({ ADMIN_NOTIFY_EMAIL: "x@y.in" })).toBe("x@y.in");
  });
  it("terms and refund describe instant activation and possible revocation", async () => {
    const { termsSections, refundSections } = await import("@/lib/legal-content");
    const text = [...termsSections(), ...refundSections()].flatMap((s) => s.body).join(" ");
    expect(text).toMatch(/activated instantly/);
    expect(text).toMatch(/may revoke/);
    expect(text).not.toMatch(/verified manually|within 24 hours/);
  });
  it("revoke ends Pro immediately via the state machine", () => {
    const active = { state: "active" as const, trialEndsAt: null, periodEnd: new Date(Date.now() + 864e5), appliedPayments: ["upi:x"] };
    const r = transition(active, { type: "CANCEL_REQUESTED", atPeriodEnd: false });
    expect(r.ok && r.snapshot.state).toBe("cancelled");
  });
});
