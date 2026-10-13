import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { razorpayConfig, verifyCheckoutSignature } from "@/lib/billing/providers/razorpay";

export const runtime = "nodejs";

/**
 * Checkout.js success callback. Verifies the signature only; access is granted
 * solely by the signed `subscription.charged` webhook, never by the browser.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, string>;
  const acct = await prisma.billingAccount.findUnique({ where: { userId: session.user.id } });
  if (!acct?.providerSubscriptionId || acct.providerSubscriptionId !== body.razorpay_subscription_id) return Response.json({ error: "Unknown subscription" }, { status: 400 });
  const ok = verifyCheckoutSignature(razorpayConfig().keySecret, body.razorpay_payment_id ?? "", body.razorpay_subscription_id ?? "", body.razorpay_signature ?? "");
  return Response.json({ verified: ok, note: ok ? "Payment received. Access unlocks when Razorpay confirms the charge." : "Signature mismatch" }, { status: ok ? 200 : 400 });
}
