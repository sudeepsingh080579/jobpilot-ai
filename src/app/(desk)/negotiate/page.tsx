import Link from "next/link";
import { NegotiateSetup } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function NegotiatePage() {
  const user = await requireUser();
  const [jobs, sessions] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id, status: { in: ["OFFER", "INTERVIEWING"] } } }),
    prisma.negotiationSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Offer" title="Negotiation" lede="A counter-offer script, then a text role-play. You get a scored report when you stop." />
      <NegotiateSetup jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company }))} />
      <ul className="mt-4 space-y-2">
        {sessions.map((session) => (
          <li key={session.id}><Link className="desk-card block p-3 text-sm" href={`/negotiate/${session.id}`}>{session.title} · {session.status}</Link></li>
        ))}
      </ul>
    </div>
  );
}
