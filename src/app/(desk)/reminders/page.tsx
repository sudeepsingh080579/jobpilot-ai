import { ReminderDesk } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function RemindersPage() {
  const user = await requireUser();
  const [reminders, jobs] = await Promise.all([
    prisma.reminder.findMany({ where: { userId: user.id }, orderBy: { dueAt: "asc" } }),
    prisma.job.findMany({ where: { userId: user.id, archived: false } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Follow-through" title="Reminders" lede="Due items raise an in-app note. Web Push fires too, when this browser allows it." />
      <ReminderDesk
        pushKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""}
        items={reminders.map((item) => ({ id: item.id, title: item.title, body: item.body, dueAt: item.dueAt.toISOString(), done: item.done }))}
        jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company }))}
      />
    </div>
  );
}
