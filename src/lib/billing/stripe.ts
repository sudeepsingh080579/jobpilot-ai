import Stripe from "stripe";
import { stripeConfig } from "@/lib/billing/config";

let client: Stripe | null = null;

/** Returns a Stripe client, or null when STRIPE_SECRET_KEY is not set. */
export function getStripe(): Stripe | null {
  const { secretKey } = stripeConfig();
  if (!secretKey) return null;
  if (!client) client = new Stripe(secretKey, { appInfo: { name: "JobPilot AI" } });
  return client;
}
