import type { BillingEvent } from "@/lib/billing/state-machine";

export type ProviderId = "razorpay" | "stripe" | "upi_manual";

export type CheckoutRequest = { userId: string; email: string; name: string; plan: "pro_monthly" };

/** What the browser needs to complete payment. Razorpay opens its Checkout.js modal; Stripe redirects. */
export type CheckoutSession =
  | { kind: "razorpay_modal"; keyId: string; subscriptionId: string; customerId?: string }
  | { kind: "redirect"; url: string; customerId: string }
  | { kind: "upi_page"; url: string };

/** A verified webhook turned into our vocabulary. */
export type NormalizedEvent = {
  id: string;
  providerType: string;
  subscriptionId: string | null;
  customerId: string | null;
  userId: string | null;
  event: BillingEvent | null;
};

export interface BillingProvider {
  readonly id: ProviderId;
  /** Keys and plan ids present. Never throws. */
  configured(): boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  cancel(subscriptionId: string, atPeriodEnd: boolean): Promise<void>;
  /** Constant-time signature check over the raw request body. */
  verifyWebhook(rawBody: string, signature: string | null): boolean;
  parseWebhook(rawBody: string, eventId: string | null): NormalizedEvent;
}

export class BillingNotConfiguredError extends Error {
  constructor(provider: ProviderId) {
    super(`${provider} billing is not configured on this server`);
  }
}
