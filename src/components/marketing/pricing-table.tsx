"use client";

import Link from "next/link";
import { Check } from "lucide-react";

type Props = { signedIn: boolean; configured: boolean; currentPlan?: string };

const PRO_FEATURES = [
  "600 AI actions a month",
  "Resume tailoring and ATS keyword match",
  "Cover letters and follow-up drafts",
  "Referral outreach drafts you send yourself",
  "Pitch decks for target companies",
  "Mock interviews and salary negotiation practice",
  "LinkedIn post and profile drafts",
];

const FREE_FEATURES = ["Job tracker board", "Resume editor and score", "Read, export or delete your data", "No AI features after the trial"];

export function PricingTable({ signedIn, configured, currentPlan }: Props) {
  const plan = "pro_monthly"; // India plan is monthly only (spec §3)
  const isCurrent = currentPlan === plan;

  return (
    <div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <div className="desk-card p-6">
          <h3 className="text-xl font-bold">Free</h3>
          <p className="mt-1 text-sm text-muted">After your 7-day trial. Nothing is charged automatically.</p>
          <p className="mt-5 text-4xl font-bold">₹0</p>
          <ul className="mt-5 space-y-2 text-sm">
            {FREE_FEATURES.map((item) => (
              <li key={item} className="flex gap-2"><Check className="size-4 shrink-0 text-teal" />{item}</li>
            ))}
          </ul>
          <Link href={signedIn ? "/dashboard" : "/register"} className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full border-2 border-indigo font-bold text-indigo">
            {signedIn ? "Go to my desk" : "Start free trial"}
          </Link>
        </div>

        <div className="relative rounded-3xl bg-gradient-to-br from-indigo via-violet to-indigo-deep p-6 text-white shadow-lg">
          <span className="absolute right-5 top-5 rounded-full bg-coral px-3 py-1 text-xs font-bold">Most popular</span>
          <h3 className="text-xl font-bold">Pro Monthly</h3>
          <p className="mt-1 text-sm text-white/80">Everything, for a serious search.</p>
          <p className="mt-5 text-4xl font-bold" data-testid="pro-price">
            ₹1,999
            <span className="text-base font-semibold text-white/80"> / month</span>
          </p>
          <p className="text-sm text-white/80" data-testid="pro-total">incl. 18% GST. ₹1,999 payable a month. Billed monthly. Cancel any time.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {PRO_FEATURES.map((item) => (
              <li key={item} className="flex gap-2"><Check className="size-4 shrink-0 text-sun" />{item}</li>
            ))}
          </ul>
          {!signedIn ? (
            <Link href="/register" className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-full bg-sun font-bold text-ink">
              Try Pro free for 7 days
            </Link>
          ) : !configured ? (
            <p className="mt-6 rounded-2xl bg-white/15 px-4 py-3 text-sm" data-testid="payments-not-configured">Payments are not configured on this server yet.</p>
          ) : isCurrent ? (
            <p className="mt-6 rounded-2xl bg-white/15 px-4 py-3 text-sm font-semibold">This is your current plan.</p>
          ) : (
            <form action={currentPlan ? "/api/stripe/portal" : "/api/stripe/checkout"} method="post" className="mt-6">
              <input type="hidden" name="plan" value={plan} />
              <button type="submit" data-testid="checkout" className="h-12 w-full rounded-full bg-sun font-bold text-ink">
                {currentPlan ? "Manage billing" : "Upgrade to Pro Monthly"}
              </button>
            </form>
          )}
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-muted">All prices in Indian Rupees (INR). Pro: ₹1,999 per month incl. 18% GST (taxable value ₹1,694.07 + GST ₹304.93). Monthly plan only.</p>
    </div>
  );
}
