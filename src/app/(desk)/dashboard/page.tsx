import Link from "next/link";
import { DueReminders, SnapshotWriter } from "@/components/pwa";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { JOB_STAGES } from "@/lib/domain";
import { buildWeeklyPlan } from "@/lib/scoring/weekly";
import { daysAgo, formatWhen, weekKey } from "@/lib/utils";
import { requireUser } from "@/server/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const [jobs, resume, posts, outreachDue, reminders] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { updatedAt: "desc" } }),
    prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true } }),
    prisma.linkedInPost.count({ where: { userId: user.id, weekOf: weekKey() } }),
    prisma.contact.count({ where: { userId: user.id, messages: { none: { step: "FINAL" } } } }),
    prisma.reminder.findMany({ where: { userId: user.id, done: false }, orderBy: { dueAt: "asc" }, take: 4 }),
  ]);
  const count = (status: string) => jobs.filter((job) => job.status === status).length;
  const weekAgo = daysAgo(7);
  const plan = buildWeeklyPlan({
    saved: count("SAVED"),
    applied: count("APPLIED"),
    screening: count("SCREENING"),
    interviewing: count("INTERVIEWING"),
    offers: count("OFFER"),
    staleFollowups: jobs.filter((job) => ["APPLIED", "SCREENING"].includes(job.status) && job.appliedAt && job.appliedAt < weekAgo).length,
    outreachDue,
    resumeScore: resume?.score ?? null,
    hasPrimaryResume: Boolean(resume),
    postsThisWeek: posts,
  });
  const snapshot = {
    name: user.name,
    headline: user.headline,
    plan,
    jobs: jobs.slice(0, 8).map((job) => ({ title: job.title, company: job.company, status: job.status })),
    resume: resume ? { title: resume.title, score: resume.score } : null,
  };

  return (
    <div>
      <SnapshotWriter snapshot={snapshot} />
      <DueReminders />
      <PageHeader
        eyebrow="This week"
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        lede={`${user.currentTitle || user.headline || "Your search"} · ${user.location || "Location not set"}`}
      />
      <section data-testid="weekly-plan" className="grid gap-3 md:grid-cols-2">
        {plan.map((item) => (
          <Link key={item.id} href={item.href} className="desk-card p-4 transition hover:border-pine">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-brass">{item.tone}</p>
            <h2 className="mt-1 font-serif text-2xl">{item.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>
      <section className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {JOB_STAGES.map((stage) => (
          <Link key={stage.id} href="/tracker" className="desk-card px-3 py-3">
            <p className="text-xs text-muted">{stage.label}</p>
            <p className="font-serif text-3xl">{count(stage.id)}</p>
          </Link>
        ))}
      </section>
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="desk-card p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl">Follow-ups</h2>
            <Link className="text-sm text-pine" href="/reminders">
              All reminders
            </Link>
          </div>
          {reminders.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing scheduled. Add a nudge when you send a note.</p> : null}
          <ul className="mt-3 space-y-2">
            {reminders.map((reminder) => (
              <li key={reminder.id} className="rounded-lg bg-cream px-3 py-2 text-sm">
                <p className="font-medium">{reminder.title}</p>
                <p className="text-muted">{formatWhen(reminder.dueAt, user.timezone)}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="desk-card p-4">
          <h2 className="font-serif text-2xl">Primary resume</h2>
          {resume ? (
            <Link href={`/resumes/${resume.id}`} className="mt-3 flex items-end justify-between rounded-lg bg-mist px-4 py-4">
              <div>
                <p className="font-medium">{resume.title}</p>
                <p className="text-sm text-muted">{resume.template}</p>
              </div>
              <p className="font-serif text-4xl text-pine">{resume.score ?? "–"}</p>
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted">
              No primary resume yet. <Link className="text-pine" href="/resumes">Add one</Link>.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link className="rounded-lg border border-line px-3 py-2" href="/assistant">
              Ask the assistant
            </Link>
            <Link className="rounded-lg border border-line px-3 py-2" href="/analytics">
              Funnel
            </Link>
            <Link className="rounded-lg border border-line px-3 py-2" href="/search">
              Search roles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
