import { notFound } from "next/navigation";
import { NegotiateRunner } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function NegotiationPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const session = await prisma.negotiationSession.findFirst({ where: { id, userId: user.id } });
  if (!session) notFound();
  return (
    <div>
      <PageHeader eyebrow="Role-play" title={session.title} lede={`Target ${session.target}. Floor ${session.floor}.`} />
      <NegotiateRunner sessionId={session.id} script={session.script} initial={parseJson(session.transcript, [])} report={parseJson(session.report, {})} />
    </div>
  );
}
