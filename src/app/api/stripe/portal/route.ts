import { auth } from "@/auth";
import { appUrl } from "@/lib/billing/config";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/** POST → 303 to the Stripe Customer Portal (change plan, cancel, card, invoices). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return Response.redirect(`${appUrl()}/login`, 303);
  const stripe = getStripe();
  if (!stripe) return Response.redirect(`${appUrl()}/settings/billing?error=not_configured`, 303);
  const sub = await prisma.subscription.findUnique({ where: { userId: session.user.id } });
  if (!sub) return Response.redirect(`${appUrl()}/pricing`, 303);
  const portal = await stripe.billingPortal.sessions.create({
    customer: sub.stripeCustomerId,
    return_url: `${appUrl()}/settings/billing`,
    ...(process.env.STRIPE_PORTAL_CONFIGURATION ? { configuration: process.env.STRIPE_PORTAL_CONFIGURATION } : {}),
  });
  return Response.redirect(portal.url, 303);
}
