import type { Metadata } from "next";
import { auth } from "@/auth";
import { activeProviderId, getBillingProvider } from "@/lib/billing/providers";
import { actionUser } from "@/server/session";
import { getEntitlement } from "@/server/billing";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Pro at ₹1,999 a month, incl. 18% GST. Start with a 7-day free trial, no card needed.",
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ checkout?: string }> }) {
  const query = await searchParams;
  const session = await auth();
  const user = session?.user?.id ? await actionUser() : null;
  const ent = user ? await getEntitlement(user) : null;
  const active = ent?.plan === "pro" ? (ent.paidPlan ?? "pro_monthly") : undefined;
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="mx-auto max-w-4xl px-5 py-10">
        <h1 className="text-center text-4xl font-bold tracking-tight sm:text-5xl">Simple pricing</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-lg text-muted">Try every Pro feature free for 7 days. No card needed.</p>
        {query.checkout === "cancelled" ? <p className="mx-auto mt-4 w-fit rounded-full bg-sun-soft px-4 py-2 text-sm">Checkout cancelled. Nothing was charged.</p> : null}
        <div className="mt-10">
          <PricingTable signedIn={Boolean(session?.user)} configured={getBillingProvider().configured()} checkoutHref={activeProviderId() === "upi_manual" ? "/settings/billing/upi" : undefined} currentPlan={active || undefined} />
        </div>
        <section className="mt-16 grid gap-6 md:grid-cols-2">
          {[
            ["Can I cancel any time?", "Yes. You keep Pro until the end of the period you paid for."],
            ["What happens after the trial?", "Your account moves to the Free plan. Nothing is deleted and you are never charged unless you upgrade."],
            ["Is GST included?", "Yes. ₹1,999 a month includes 18% GST (₹1,694.07 + ₹304.93 GST). That is the full amount you pay. All prices are in Indian Rupees."],
            ["Is there an annual plan?", "No. Pro is a monthly plan only."],
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
