import { emailMode } from "@/lib/email";
import { AppShell } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { requireUser } from "@/server/session";
import { getEntitlement } from "@/server/billing";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [ent, messages, jobs] = await Promise.all([
    getEntitlement(user),
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
      planLabel={ent.plan === "pro" ? "Pro" : ent.plan === "trial" ? `Trial · ${ent.trialDaysLeft}d left` : "Free · Upgrade"}
      banner={
        !user.emailVerified && emailMode() !== "console" ? (
          <p className="mb-4 rounded-2xl bg-sun-soft px-4 py-3 text-sm font-semibold text-ink" data-testid="verify-banner">
            Please confirm your email address. <Link className="underline" href="/verify-email">Resend the link</Link>
          </p>
        ) : ent.status === "past_due" ? (
          <p className="mb-4 rounded-2xl bg-coral-soft px-4 py-3 text-sm font-semibold text-ink">
            Your last payment failed. <Link className="underline" href="/settings/billing">Update your card</Link> to keep Pro.
          </p>
        ) : null
      }
    >
      {children}
    </AppShell>
  );
}
