import { createRazorpayProvider } from "@/lib/billing/providers/razorpay";
import { createUpiManualProvider } from "@/lib/billing/providers/upi-manual";
import { createStripeProvider } from "@/lib/billing/providers/stripe";
import type { BillingProvider, ProviderId } from "@/lib/billing/providers/types";

type Env = Record<string, string | undefined>;

/**
 * Razorpay is the default for India (spec §3). Stripe stays available as a
 * provider (BILLING_PROVIDER=stripe) and keeps its existing routes under
 * /api/stripe/*; checkout/webhook wiring for both is completed in phase 5.
 */
export function activeProviderId(env: Env = process.env): ProviderId {
  const v = env.BILLING_PROVIDER?.trim().toLowerCase();
  return v === "stripe" ? "stripe" : v === "upi_manual" ? "upi_manual" : "razorpay";
}

export function getBillingProvider(env: Env = process.env): BillingProvider {
  const id = activeProviderId(env);
  return id === "stripe" ? createStripeProvider(env) : id === "upi_manual" ? createUpiManualProvider(env) : createRazorpayProvider(env);
}

export type { BillingProvider, ProviderId } from "@/lib/billing/providers/types";
