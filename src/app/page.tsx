import Link from "next/link";
import { redirect } from "next/navigation";
import { BriefcaseBusiness, FileText, MessageCircle, Mic, Send, Target } from "lucide-react";
import { auth } from "@/auth";
import { activeProviderId, getBillingProvider } from "@/lib/billing/providers";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

const STEPS = [
  { icon: Target, title: "Pick your target", body: "Name the role and level you want. Get a clear niche and the keywords that matter.", tone: "bg-sun" },
  { icon: FileText, title: "Tailor your resume", body: "Match each posting, see your ATS keyword gaps, and fix them in one place.", tone: "bg-coral text-white" },
  { icon: BriefcaseBusiness, title: "Track every job", body: "A simple board from saved to offer, with follow-up reminders on your phone.", tone: "bg-teal text-white" },
  { icon: Send, title: "Get referrals", body: "Short, honest outreach drafts that you review and send yourself.", tone: "bg-indigo text-white" },
  { icon: Mic, title: "Practise interviews", body: "Mock questions with instant feedback on structure, numbers and clarity.", tone: "bg-violet text-white" },
  { icon: MessageCircle, title: "Negotiate the offer", body: "Rehearse the salary conversation before it counts.", tone: "bg-sun" },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={false} />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
          <div className="rounded-[2rem] bg-gradient-to-br from-indigo via-violet to-indigo-deep px-6 py-16 text-center text-white sm:px-12">
            <p className="mx-auto mb-4 w-fit rounded-full bg-sun px-4 py-1 text-sm font-bold text-ink">For professionals everywhere</p>
            <h1 data-testid="landing-headline" className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
              One clear next step for your job search.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
              {`JobPilot AI turns a messy search into a short, guided plan: target, resume, applications, referrals, interviews and offer.`}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/register" data-testid="landing-cta" className="inline-flex h-14 items-center justify-center rounded-full bg-sun px-10 text-lg font-bold text-ink">
                Start your free 7-day trial
              </Link>
              <Link href="/pricing" className="inline-flex h-14 items-center justify-center rounded-full border-2 border-white/60 px-8 font-bold">
                See pricing
              </Link>
            </div>
            <p className="mt-4 text-sm text-white/75">No card needed. Works on phone and desktop. Install it like an app.</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold">Six steps, one screen at a time</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title} className="desk-card p-6">
                <span className={`grid size-12 place-items-center rounded-2xl ${step.tone}`}>
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-5">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["You stay in control", "Nothing is sent or posted for you. Every message is a draft you copy and send."],
              ["Private by default", "Your data is yours. Export it or delete your account from Settings at any time."],
              ["Global", "Any country, any currency. Remote, hybrid or on-site."],
            ].map(([title, body]) => (
              <div key={title} className="rounded-3xl bg-sun-soft p-6">
                <h3 className="font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto mt-16 max-w-4xl px-5">
          <h2 className="mb-8 text-center text-3xl font-bold">Pricing</h2>
          <PricingTable signedIn={false} configured={getBillingProvider().configured()} checkoutHref={activeProviderId() === "upi_manual" ? "/settings/billing/upi" : undefined} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
