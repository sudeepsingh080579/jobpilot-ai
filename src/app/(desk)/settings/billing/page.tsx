import { formatInr, gstRateBps, priceBreakdown } from "@/lib/billing/pricing";
import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { stripeConfig } from "@/lib/billing/config";
import { activeProviderId, getBillingProvider } from "@/lib/billing/providers";
import { cancelPlanAction } from "@/server/upi-actions";
import { LIMITS, PRICES } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { aiUsed, getEntitlement } from "@/server/billing";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Billing" };

const ERRORS: Record<string, string> = {
  not_configured: "Payments are not configured on this server yet.",
  verify: "Confirm your email address before upgrading.",
  already: "You already have an active subscription. Use Manage billing to change it.",
  rate: "Too many attempts. Try again in a few minutes.",
  stripe: "The payment provider did not return a checkout page. Try again.",
};

function fmt(date: Date | null) {
  return date ? date.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "";
}

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ checkout?: string; error?: string }> }) {
  const price = priceBreakdown(undefined, gstRateBps());
  const query = await searchParams;
  const user = await requireUser();
  const [ent, used, sub] = await Promise.all([getEntitlement(user), aiUsed(user.id), prisma.subscription.findUnique({ where: { userId: user.id } })]);
  const config = stripeConfig();
  const providerReady = getBillingProvider().configured();
  const upi = activeProviderId() === "upi_manual";
  const account = await prisma.billingAccount.findUnique({ where: { userId: user.id } });
  const pct = Math.min(100, Math.round((used / ent.aiPerMonth) * 100));

  return (
    <div className="max-w-2xl space-y-4" data-testid="billing-page">
      <PageHeader eyebrow="Account" title="Plan and billing" />
      {!providerReady ? (
        <p className="rounded-2xl border-2 border-sun bg-sun-soft px-4 py-3 text-sm font-semibold" data-testid="payments-not-configured">
          Payments are not configured on this server yet. Upgrades will open here once checkout is enabled.
        </p>
      ) : null}
      {query.checkout === "success" ? (
        <p className="rounded-2xl bg-teal-soft px-4 py-3 text-sm font-semibold">Thanks! Your payment went through. Pro turns on as soon as the payment provider confirms it, usually within a few seconds.</p>
      ) : null}
      {query.error && ERRORS[query.error] ? <p className="rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold">{ERRORS[query.error]}</p> : null}

      <section className="rounded-3xl bg-gradient-to-br from-indigo via-violet to-indigo-deep p-6 text-white">
        <p className="text-sm font-semibold text-white/80">Current plan</p>
        <p className="mt-1 text-3xl font-bold" data-testid="current-plan">
          {ent.plan === "pro" ? (ent.paidPlan ? PRICES[ent.paidPlan].label : "Pro") : ent.plan === "trial" ? "Pro trial" : "Free"}
        </p>
        <p className="mt-2 text-sm text-white/85">
          {ent.plan === "trial" && `${ent.trialDaysLeft} day${ent.trialDaysLeft === 1 ? "" : "s"} left in your trial. No card on file.`}
          {ent.plan === "pro" && ent.cancelAtPeriodEnd && `Cancels on ${fmt(ent.currentPeriodEnd)}. You keep Pro until then.`}
          {ent.plan === "pro" && !ent.cancelAtPeriodEnd && ent.currentPeriodEnd && (account?.provider === "upi_manual" ? `Pro until ${fmt(ent.currentPeriodEnd)}. UPI plans do not renew automatically.` : `Renews on ${fmt(ent.currentPeriodEnd)}.`)}
          {ent.plan === "pro" && ent.status === "past_due" && " Your last payment failed. Update your card to keep Pro."}
          {ent.plan === "free" && "Upgrade to unlock every tool and a bigger AI allowance."}
        </p>
        <div className="mt-5">
          <div className="flex justify-between text-sm"><span>AI actions this month</span><span data-testid="ai-usage">{used} / {ent.aiPerMonth}</span></div>
          <div className="mt-1 h-3 rounded-full bg-white/20"><div className="h-3 rounded-full bg-sun" style={{ width: `${pct}%` }} /></div>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        {upi && providerReady && ent.plan !== "pro" ? (
          <Link href="/settings/billing/upi" className="inline-flex h-12 items-center rounded-full bg-sun px-6 font-bold text-ink" data-testid="upi-pay-link">
            {`Pay ${formatInr(price.totalPaise)} with UPI · Pro for 30 days`}
          </Link>
        ) : null}
        {account?.state === "active" ? (
          <form action={cancelPlanAction}>
            <button className="h-12 rounded-full border-2 border-coral px-6 font-bold" type="submit" data-testid="cancel-plan">Cancel (no renewal)</button>
          </form>
        ) : null}
        {ent.plan !== "pro" && !upi ? (
          <Link href="/pricing" className="inline-flex h-12 items-center rounded-full bg-sun px-6 font-bold text-ink" data-testid="upgrade-link">
            Upgrade · {formatInr(price.totalPaise)}/month incl. {price.gstRateBps / 100}% GST
          </Link>
        ) : null}
        {sub && config.secretKey ? (
          <form action="/api/stripe/portal" method="post">
            <button className="h-12 rounded-full border-2 border-indigo px-6 font-bold text-indigo" type="submit">
              Manage billing, invoices or cancel
            </button>
          </form>
        ) : null}
      </div>
      <p className="text-xs text-muted">
        Free: {LIMITS.free.aiPerMonth} AI actions a month. Trial: {LIMITS.trial.aiPerMonth}. Pro: {LIMITS.pro.aiPerMonth}. Allowances reset on the 1st (UTC). See the <Link className="underline" href="/refund">Refund Policy</Link>.
      </p>
    </div>
  );
}
