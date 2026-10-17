import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { legalConfig } from "@/lib/legal";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = { title: "Support and grievances" };
export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const session = await auth();
  const c = legalConfig();
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(session?.user)} />
      <main className="mx-auto max-w-3xl space-y-8 px-5 py-10">
        <h1 className="text-4xl font-bold tracking-tight">Support and grievances</h1>
        <section>
          <h2 className="text-xl font-bold">Get help</h2>
          <p className="mt-2 leading-7 text-muted">
            {c.supportEmail ? <>Email <a className="underline" href={`mailto:${c.supportEmail}`}>{c.supportEmail}</a> from the address on your account.</> : <>Our support inbox is being set up. Meanwhile, most account actions are self-service in the app.</>}
          </p>
        </section>
        <section>
          <h2 className="text-xl font-bold">Do it yourself</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>Plan, trial status and AI usage: <Link className="underline" href="/settings/billing">Settings → Billing</Link></li>
            <li>Download your data or delete your account: <Link className="underline" href="/settings">Settings</Link></li>
            <li>Forgot your password: <Link className="underline" href="/forgot-password">reset it</Link></li>
          </ul>
        </section>
        <section>
          <h2 className="text-xl font-bold">Grievance Officer (DPDP Act, 2023)</h2>
          <p className="mt-2 leading-7 text-muted" data-testid="grievance">
            {c.grievanceName ? `${c.grievanceName}` : "Grievance Officer, " + c.entity}
            {c.grievanceEmail ? <> · <a className="underline" href={`mailto:${c.grievanceEmail}`}>{c.grievanceEmail}</a></> : null}
          </p>
          <p className="mt-2 leading-7 text-muted">Use this for complaints about how your personal data is handled, or to exercise your rights to access, correct or erase your data. If you are not satisfied with our response, you can approach the Data Protection Board of India. See the <Link className="underline" href="/privacy">Privacy Policy</Link>.</p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
