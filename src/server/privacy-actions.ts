"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getStripe } from "@/lib/billing/stripe";
import { captureError } from "@/lib/monitoring";
import { prisma } from "@/lib/prisma";
import { actionUser } from "@/server/session";

/** GDPR/CCPA erasure: cancels Stripe billing, then deletes the user (all rows cascade). */
export async function deleteAccountAction(formData: FormData) {
  const user = await actionUser();
  if (!user) redirect("/login");
  if (String(formData.get("confirm") ?? "") !== "DELETE") redirect("/settings?error=confirm");
  const sub = await prisma.subscription.findUnique({ where: { userId: user.id } });
  const stripe = getStripe();
  if (sub && stripe) {
    try {
      if (sub.stripeSubscriptionId && !["canceled", "incomplete_expired"].includes(sub.status)) {
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      }
      // Removes the customer's saved payment methods; invoices stay in Stripe for tax records.
      await stripe.customers.del(sub.stripeCustomerId);
    } catch (error) {
      await captureError(error, { where: "delete-account-stripe", userId: user.id });
    }
  }
  await prisma.user.delete({ where: { id: user.id } });
  await signOut({ redirectTo: "/?deleted=1" });
}
