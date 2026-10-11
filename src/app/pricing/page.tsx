import type { Metadata } from "next";
import { auth } from "@/auth";
import { stripeConfig } from "@/lib/billing/config";
import { prisma } from "@/lib/prisma";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pro Monthly at $40 a month or Pro Annual at $400 a year. Start with a 7-day free trial, no card needed.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const query = await searchParams;
  const session = await auth();
  const sub = session?.user?.id ? await prisma.subscription.findUnique({ where: { userId: session.user.id } }) : null;
  const active = sub && ["active", "trialing", "past_due"].includes(sub.status) ? sub.plan : undefined;
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">Simple pricing</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-lg text-muted">Try every Pro feature free for 7 days. No card needed.</p>
        {query.checkout === "cancelled" ? <p className="mx-auto mt-4 w-fit rounded-full bg-sun-soft px-4 py-2 text-sm">Checkout cancelled. Nothing was charged.</p> : null}
        <div className="mt-10">
          <PricingTable signedIn={Boolean(session?.user)} configured={stripeConfig().configured} currentPlan={active || undefined} />
        </div>
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {[
            ["Can I cancel any time?", "Yes. Cancel from Settings → Billing. You keep Pro until the end of the period you paid for."],
            ["What happens after the trial?", "Your account moves to the Free plan. Nothing is deleted and you are never charged unless you upgrade."],
            ["Do you add tax?", "Sales tax, VAT or GST is calculated at checkout based on your location, where required."],
            ["Can I switch between monthly and annual?", "Yes. Use Manage billing; Stripe prorates the change."],
          ].map(([q, a]) => (
            <div key={q} className="desk-card p-5">
              <h2 className="font-bold">{q}</h2>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </div>
          ))}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
