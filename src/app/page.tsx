import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Check, FileText, Search, Send, Target, UploadCloud } from "lucide-react";
import { auth } from "@/auth";
import { activeProviderId, getBillingProvider } from "@/lib/billing/providers";
import { PricingTable } from "@/components/marketing/pricing-table";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";

const STEPS = [
  { icon: UploadCloud, title: "Upload your resume", body: "Drop a PDF or DOCX. No form to fill in first.", tone: "bg-sun" },
  { icon: FileText, title: "See your ATS score", body: "We read it the way an applicant tracking system does and rebuild it as a clean, single-column resume using only your own facts.", tone: "bg-coral text-white" },
  { icon: Target, title: "Pick your target roles", body: "Choose the roles and cities you want. Keywords align to the role, and the score updates.", tone: "bg-teal text-white" },
  { icon: Search, title: "We find fresh jobs", body: "Employer career pages are scanned for roles posted in the last few days, in the places you chose.", tone: "bg-indigo text-white" },
  { icon: Send, title: "Apply with a tailored resume", body: "Good matches come with a tailored ATS resume and prepared answers. You open the page and submit.", tone: "bg-violet text-white" },
  { icon: CalendarClock, title: "Run it daily", body: "Switch on the daily run, pick a time, and new matches are waiting for you.", tone: "bg-sun" },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={false} />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-10">
          <div className="grid items-center gap-8 rounded-[2rem] bg-gradient-to-br from-indigo via-violet to-indigo-deep px-6 py-14 text-white sm:px-12 lg:grid-cols-[1.2fr,1fr]">
            <div>
              <p className="mb-4 w-fit rounded-full bg-sun px-4 py-1 text-sm font-bold text-ink">AI job-search service for job seekers</p>
              <h1 data-testid="landing-headline" className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Get your resume past the ATS. Then find the jobs that fit it.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-white/85">
                Upload your resume. JobPilot AI makes it ATS-compliant without inventing a single fact, then scans employer career pages for matching roles posted in the last 3 days.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/start" data-testid="landing-cta" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-sun px-10 text-lg font-bold text-ink">
                  <UploadCloud className="size-5" /> Upload your resume
                </Link>
                <Link href="/pricing" className="inline-flex h-14 items-center justify-center rounded-full border-2 border-white/60 px-8 font-bold">See pricing</Link>
              </div>
              <p className="mt-4 text-sm text-white/75">Free to start, no card. Your original file is always kept. Nothing is sent to an employer for you.</p>
            </div>
            <div className="rounded-3xl bg-white p-5 text-ink shadow-xl" aria-label="Illustration of an ATS score before and after">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Illustration</p>
              <div className="mt-3 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-coral-soft p-4"><p className="text-xs font-semibold">Before</p><p className="text-4xl font-bold text-coral">ATS score</p><p className="text-xs text-muted">columns, icons, vague bullets</p></div>
                <div className="rounded-2xl bg-sun-soft p-4"><p className="text-xs font-semibold">After</p><p className="text-4xl font-bold text-teal">ATS score</p><p className="text-xs text-muted">one column, standard headings</p></div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {["Standard headings an ATS recognises", "Action-verb bullets from your own facts", "Role keywords you already have, surfaced", "Download as PDF and DOCX"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Check className="size-4 text-teal" />{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5" id="how-it-works">
          <h2 className="text-center text-3xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="desk-card p-6">
                <span className={`grid size-12 place-items-center rounded-2xl ${step.tone}`}>
                  <step.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{i + 1}. {step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/start" className="inline-flex h-12 items-center justify-center rounded-full bg-indigo px-8 font-bold text-white">Upload your resume</Link>
          </div>
        </section>

        <section className="mx-auto mt-16 max-w-6xl px-5">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Only your facts", "Employers, titles, dates, skills and numbers are never invented. Where a number or keyword would help, we suggest it and you decide."],
              ["You press submit", "Employer sites need your own login and consent, so JobPilot prepares everything and you submit. It never applies behind your back."],
              ["Real, fresh listings", "Roles come from employer career pages with a posting date. If a date can't be confirmed, it is labelled “date unknown” instead of guessed."],
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
