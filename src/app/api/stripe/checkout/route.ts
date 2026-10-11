import { auth } from "@/auth";
import { appUrl, stripeConfig } from "@/lib/billing/config";
import type { PaidPlan } from "@/lib/billing/plans";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function back(path: string) {
  return Response.redirect(`${appUrl()}${path}`, 303);
}

/** POST plan=pro_monthly|pro_annual → 303 to Stripe Checkout (subscription mode). */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return back("/login?next=/pricing");
  const config = stripeConfig();
  const stripe = getStripe();
  if (!config.configured || !stripe) return back("/settings/billing?error=not_configured");
  const limit = await rateLimit(`checkout:${session.user.id}`, 10, 10 * 60_000);
  if (!limit.ok) return back("/settings/billing?error=rate");

  const form = await request.formData();
  const plan = String(form.get("plan") ?? "") as PaidPlan;
  const price = config.prices[plan];
  if (!price) return back("/pricing?error=plan");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { subscription: true } });
  if (!user) return back("/login");
  if (!user.emailVerified) return back("/settings/billing?error=verify");
  if (user.subscription && ["active", "trialing", "past_due"].includes(user.subscription.status)) {
    return back("/settings/billing?error=already");
  }

  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, metadata: { userId: user.id } });
    customerId = customer.id;
    await prisma.subscription.create({ data: { userId: user.id, stripeCustomerId: customerId, status: "incomplete" } });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    automatic_tax: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    tax_id_collection: { enabled: true },
    billing_address_collection: "auto",
    subscription_data: { metadata: { userId: user.id, plan } },
    metadata: { userId: user.id, plan },
    success_url: `${appUrl()}/settings/billing?checkout=success`,
    cancel_url: `${appUrl()}/pricing?checkout=cancelled`,
  });
  if (!checkout.url) return back("/settings/billing?error=stripe");
  return Response.redirect(checkout.url, 303);
}
