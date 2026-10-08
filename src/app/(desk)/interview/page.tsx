import Link from "next/link";
import { InterviewSetup } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function InterviewPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const [jobs, sessions] = await Promise.all([
    prisma.job.findMany({ where: { userId: user.id, archived: false } }),
    prisma.interviewSession.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  const ordered = query.job ? [...jobs].sort((a, b) => (a.id === query.job ? -1 : b.id === query.job ? 1 : 0)) : jobs;
  return (
    <div>
      <PageHeader eyebrow="Practice" title="Interview studio" lede="Five questions from the bank, generated, or typed by you. Answer in text or with the mic. Scoring covers content, filler words, and pace." />
      <InterviewSetup jobs={ordered.map((job) => ({ id: job.id, title: job.title, company: job.company }))} />
      <ul className="mt-4 space-y-2">
        {sessions.map((session) => (
          <li key={session.id}><Link className="desk-card block p-3 text-sm" href={`/interview/${session.id}`}>{session.title} · {session.status}</Link></li>
        ))}
      </ul>
    </div>
  );
}
