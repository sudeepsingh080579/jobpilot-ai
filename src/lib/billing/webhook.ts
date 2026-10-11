import { monthlyCents, type PaidPlan } from "@/lib/billing/plans";

/**
 * Stripe webhook logic, independent of Next.js and Prisma so it can be tested
 * with mocked events. The route verifies the signature, then calls
 * handleStripeEvent with a real store.
 */

export const HANDLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
] as const;

export type SubscriptionRecord = {
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  plan: PaidPlan | "";
  status: string;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  currency: string;
  mrrCents: number;
};

export interface BillingStore {
  /** True if this event id was already processed. Marks it processed otherwise. */
  markEvent(id: string, type: string): Promise<boolean>;
  /** Forget a processed event so Stripe's retry can run it again after a failure. */
  unmarkEvent(id: string): Promise<void>;
  userIdForCustomer(customerId: string): Promise<string | null>;
  userExists(userId: string): Promise<boolean>;
  upsertSubscription(record: SubscriptionRecord): Promise<void>;
  setStatusByCustomer(customerId: string, status: string): Promise<void>;
  notifyPaymentFailed?(userId: string, hostedInvoiceUrl: string | null): Promise<void>;
}

export interface SubscriptionFetcher {
  retrieveSubscription(id: string): Promise<StripeSubscriptionLike>;
}

type Id = string | { id: string } | null | undefined;

export type StripeSubscriptionLike = {
  id: string;
  customer: Id;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number | null;
  currency?: string;
  metadata?: Record<string, string> | null;
  items?: {
    data: {
      current_period_end?: number | null;
      quantity?: number | null;
      price?: { id: string; unit_amount?: number | null; currency?: string; recurring?: { interval: string; interval_count?: number } | null } | null;
    }[];
  };
};

export type StripeEventLike = { id: string; type: string; data: { object: unknown } };

function idOf(value: Id) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function toRecord(
  sub: StripeSubscriptionLike,
  userId: string,
  planForPrice: (priceId: string | null) => PaidPlan | "",
): SubscriptionRecord {
  const item = sub.items?.data?.[0];
  const price = item?.price ?? null;
  const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
  const counting = ["active", "trialing", "past_due"].includes(sub.status);
  return {
    userId,
    stripeCustomerId: idOf(sub.customer) ?? "",
    stripeSubscriptionId: sub.id,
    stripePriceId: price?.id ?? null,
    plan: planForPrice(price?.id ?? null),
    status: sub.status,
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000) : null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    currency: price?.currency ?? sub.currency ?? "usd",
    mrrCents:
      counting && price?.unit_amount && price.recurring
        ? monthlyCents(price.unit_amount * (item?.quantity ?? 1), price.recurring.interval, price.recurring.interval_count ?? 1)
        : 0,
  };
}

export type HandleResult = { handled: boolean; duplicate?: boolean; note?: string };

export async function handleStripeEvent(
  event: StripeEventLike,
  deps: { store: BillingStore; stripe: SubscriptionFetcher; planForPrice: (priceId: string | null) => PaidPlan | "" },
): Promise<HandleResult> {
  if (!(HANDLED_EVENTS as readonly string[]).includes(event.type)) return { handled: false, note: "ignored" };
  const { store, stripe, planForPrice } = deps;
  if (await store.markEvent(event.id, event.type)) return { handled: true, duplicate: true };

  try {
    return await process(event, store, stripe, planForPrice);
  } catch (error) {
    await store.unmarkEvent(event.id);
    throw error;
  }
}

async function resolveUser(store: BillingStore, customerId: string | null, metadataUserId?: string | null) {
  if (metadataUserId && (await store.userExists(metadataUserId))) return metadataUserId;
  if (customerId) return store.userIdForCustomer(customerId);
  return null;
}

async function process(
  event: StripeEventLike,
  store: BillingStore,
  stripe: SubscriptionFetcher,
  planForPrice: (priceId: string | null) => PaidPlan | "",
): Promise<HandleResult> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        mode?: string;
        customer?: Id;
        subscription?: Id;
        client_reference_id?: string | null;
        metadata?: Record<string, string> | null;
      };
      if (session.mode !== "subscription") return { handled: true, note: "not a subscription checkout" };
      const subId = idOf(session.subscription);
      const customerId = idOf(session.customer);
      const userId = await resolveUser(store, customerId, session.client_reference_id ?? session.metadata?.userId);
      if (!subId || !userId) return { handled: true, note: "no user or subscription" };
      const sub = await stripe.retrieveSubscription(subId);
      await store.upsertSubscription(toRecord(sub, userId, planForPrice));
      return { handled: true };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as StripeSubscriptionLike;
      const userId = await resolveUser(store, idOf(sub.customer), sub.metadata?.userId);
      if (!userId) return { handled: true, note: "unknown customer" };
      const record = toRecord(sub, userId, planForPrice);
      if (event.type === "customer.subscription.deleted") {
        record.status = "canceled";
        record.mrrCents = 0;
      }
      await store.upsertSubscription(record);
      return { handled: true };
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as { customer?: Id; hosted_invoice_url?: string | null };
      const customerId = idOf(invoice.customer);
      if (!customerId) return { handled: true, note: "no customer" };
      const userId = await store.userIdForCustomer(customerId);
      if (!userId) return { handled: true, note: "unknown customer" };
      await store.setStatusByCustomer(customerId, "past_due");
      await store.notifyPaymentFailed?.(userId, invoice.hosted_invoice_url ?? null);
      return { handled: true };
    }
  }
  return { handled: false };
}
