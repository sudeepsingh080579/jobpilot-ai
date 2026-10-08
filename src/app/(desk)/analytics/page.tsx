import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { JOB_STAGES } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

function rate(part: number, whole: number) {
  if (!whole) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const [jobs, outreach, interviews] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id, archived: false } }),
    prisma.outreachMessage.count({ where: { contact: { userId: user.id } } }),
    prisma.interviewSession.findMany({ where: { userId: user.id, status: "COMPLETE" } }),
  ]);
  const count = (status: string) => jobs.filter((job) => job.status === status).length;
  const applied = count("APPLIED") + count("SCREENING") + count("INTERVIEWING") + count("OFFER") + count("REJECTED");
  const screening = count("SCREENING") + count("INTERVIEWING") + count("OFFER");
  const interviewing = count("INTERVIEWING") + count("OFFER");
  const offers = count("OFFER");
  return (
    <div>
      <PageHeader eyebrow="Funnel" title="How the search is moving" lede="Counts from the tracker. Conversion uses roles that reached each later stage, including ones that have already moved on." actions={<Link className="text-sm text-pine" href="/tracker">Back to the board</Link>} />
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {JOB_STAGES.map((stage) => (
          <div key={stage.id} className="desk-card p-3">
            <p className="text-xs text-muted">{stage.label}</p>
            <p className="font-serif text-4xl">{count(stage.id)}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Stat label="Applied → screening" value={rate(screening, applied)} />
        <Stat label="Screening → interview" value={rate(interviewing, screening)} />
        <Stat label="Interview → offer" value={rate(offers, interviewing)} />
        <Stat label="Outreach drafts" value={String(outreach)} />
        <Stat label="Finished mock interviews" value={String(interviews.length)} />
        <Stat label="Active roles" value={String(jobs.length)} />
      </div>
      {applied === 0 ? <p className="mt-4 text-sm text-muted">Conversion stays blank until something leaves Saved.</p> : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="desk-card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-serif text-3xl">{value}</p>
    </div>
  );
}
