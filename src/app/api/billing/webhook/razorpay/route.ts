import { createRazorpayProvider } from "@/lib/billing/providers/razorpay";
import { processWebhookEvent } from "@/server/billing-store";

export const runtime = "nodejs";

/** Razorpay webhook. Signature verified over the raw body before anything is parsed. */
export async function POST(request: Request) {
  const raw = await request.text();
  const provider = createRazorpayProvider();
  if (!provider.verifyWebhook(raw, request.headers.get("x-razorpay-signature"))) return Response.json({ error: "Invalid signature" }, { status: 400 });
  let ev;
  try {
    ev = provider.parseWebhook(raw, request.headers.get("x-razorpay-event-id"));
  } catch {
    return Response.json({ error: "Bad payload" }, { status: 400 });
  }
  const result = await processWebhookEvent("razorpay", ev);
  return Response.json({ received: true, ...result });
}
