import { notFound } from "next/navigation";
import { InterviewRunner } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await prisma.interviewSession.findFirst({ where: { id, userId: user.id } });
  if (!session) notFound();
  return (
    <div>
      <PageHeader eyebrow={session.mode} title={session.title} />
      <InterviewRunner sessionId={session.id} initial={parseJson(session.questions, [])} report={parseJson(session.report, {})} />
    </div>
  );
}
