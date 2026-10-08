import { ChatPanel } from "@/components/chat-panel";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function AssistantPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const [messages, jobs] = await Promise.all([
    prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 80 }),
    prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { updatedAt: "desc" }, take: 30 }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Coordinator" title="Assistant" lede="It routes a request to the right module, then tells you the next step. Quick actions need a saved role." />
      <ChatPanel
        initialJobId={query.job}
        initial={messages.map((message) => ({ id: message.id, role: message.role, content: message.content, rating: message.rating }))}
        jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company }))}
      />
    </div>
  );
}
