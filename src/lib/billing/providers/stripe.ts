import Stripe from "stripe";
import { appUrl, stripeConfig } from "@/lib/billing/config";
import type { BillingProvider, NormalizedEvent } from "@/lib/billing/providers/types";
import { BillingNotConfiguredError } from "@/lib/billing/providers/types";

type Env = Record<string, string | undefined>;

/** Stripe behind the same interface. The legacy /api/stripe/* routes keep working for existing customers. */
export function createStripeProvider(env: Env = process.env): BillingProvider {
  const cfg = () => stripeConfig(env);
  const client = () => {
    const c = cfg();
    if (!c.secretKey) throw new BillingNotConfiguredError("stripe");
    return new Stripe(c.secretKey, { appInfo: { name: "JobPilot AI" } });
  };
  return {
    id: "stripe",
    configured: () => Boolean(cfg().secretKey && cfg().prices.pro_monthly),
    async createCheckout(req) {
      const c = cfg();
      if (!c.secretKey || !c.prices.pro_monthly) throw new BillingNotConfiguredError("stripe");
      const stripe = client();
      const customer = await stripe.customers.create({ email: req.email, name: req.name, metadata: { userId: req.userId } });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customer.id,
        client_reference_id: req.userId,
        line_items: [{ price: c.prices.pro_monthly, quantity: 1 }],
        automatic_tax: { enabled: true },
        subscription_data: { metadata: { userId: req.userId, plan: req.plan } },
        success_url: `${appUrl(env)}/settings/billing?checkout=success`,
        cancel_url: `${appUrl(env)}/pricing?checkout=cancelled`,
      });
      if (!session.url) throw new Error("Stripe did not return a checkout URL");
      return { kind: "redirect", url: session.url, customerId: customer.id };
    },
    async cancel(subscriptionId, atPeriodEnd) {
      const stripe = client();
      if (atPeriodEnd) await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
      else await stripe.subscriptions.cancel(subscriptionId);
    },
    verifyWebhook(rawBody, signature) {
      const c = cfg();
      if (!c.webhookSecret || !signature) return false;
      try {
        Stripe.webhooks.constructEvent(rawBody, signature, c.webhookSecret);
        return true;
      } catch {
        return false;
      }
    },
    parseWebhook(rawBody): NormalizedEvent {
      const evt = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, unknown> } };
      const obj = evt.data.object as { id?: string; customer?: string; subscription?: string; metadata?: Record<string, string> };
      let event: NormalizedEvent["event"] = null;
      if (evt.type === "invoice.payment_failed") event = { type: "PAYMENT_FAILED" };
      if (evt.type === "customer.subscription.deleted") event = { type: "CANCEL_REQUESTED", atPeriodEnd: false };
      return {
        id: evt.id,
        providerType: evt.type,
        subscriptionId: (evt.type.startsWith("customer.subscription") ? obj.id : obj.subscription) ?? null,
        customerId: obj.customer ?? null,
        userId: obj.metadata?.userId ?? null,
        event,
      };
    },
  };
}
