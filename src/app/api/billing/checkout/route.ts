import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { gstRateBps, priceBreakdown } from "@/lib/billing/pricing";
import { getBillingProvider } from "@/lib/billing/providers";
import { BillingNotConfiguredError } from "@/lib/billing/providers/types";
import { applyBillingEvent } from "@/server/billing-store";

export const runtime = "nodejs";

/** GET: price breakdown shown before checkout (₹1,999 incl. GST). POST: create a provider subscription. */
export async function GET() {
  return Response.json(priceBreakdown(undefined, gstRateBps()));
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const provider = getBillingProvider();
  if (!provider.configured()) return Response.json({ error: "Payments are not set up yet on this server." }, { status: 503 });
  const gate = await applyBillingEvent(user.id, { type: "CHECKOUT_STARTED" }, { provider: provider.id });
  if (!gate.ok) return Response.json({ error: "You already have an active subscription." }, { status: 409 });
  try {
    const checkout = await provider.createCheckout({ userId: user.id, email: user.email, name: user.name, plan: "pro_monthly" });
    if (checkout.kind === "razorpay_modal") await prisma.billingAccount.update({ where: { userId: user.id }, data: { providerSubscriptionId: checkout.subscriptionId } });
    return Response.json({ checkout, price: priceBreakdown(undefined, gstRateBps()) });
  } catch (e) {
    await applyBillingEvent(user.id, { type: "CHECKOUT_ABANDONED" });
    if (e instanceof BillingNotConfiguredError) return Response.json({ error: e.message }, { status: 503 });
    return Response.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
