import { AppShell } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [messages, jobs] = await Promise.all([
    prisma.chatMessage.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" }, take: 80 }),
    prisma.job.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: { id: true, title: true, company: true },
    }),
  ]);
  return (
    <AppShell
      name={user.name}
      messages={messages.map((message) => ({ id: message.id, role: message.role, content: message.content, rating: message.rating }))}
      jobs={jobs}
    >
      {children}
    </AppShell>
  );
}
