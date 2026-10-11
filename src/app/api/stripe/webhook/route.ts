import { planForPrice, stripeConfig } from "@/lib/billing/config";
import { getStripe } from "@/lib/billing/stripe";
import { handleStripeEvent, type StripeSubscriptionLike } from "@/lib/billing/webhook";
import { captureError } from "@/lib/monitoring";
import { prismaBillingStore } from "@/server/stripe-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = stripeConfig();
  const stripe = getStripe();
  if (!stripe || !config.webhookSecret) {
    return Response.json({ error: "Payments are not configured." }, { status: 503 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  // Signature verification needs the raw body, byte for byte.
  const raw = await request.text();
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, config.webhookSecret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    const result = await handleStripeEvent(event, {
      store: prismaBillingStore,
      stripe: {
        retrieveSubscription: async (id) => (await stripe.subscriptions.retrieve(id)) as unknown as StripeSubscriptionLike,
      },
      planForPrice: (priceId) => planForPrice(priceId),
    });
    return Response.json({ received: true, ...result });
  } catch (error) {
    await captureError(error, { where: "stripe-webhook", type: event.type, id: event.id });
    return Response.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
