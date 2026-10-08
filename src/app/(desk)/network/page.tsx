import { NetworkDesk } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { nextOutreachStep } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function NetworkPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const [contacts, templates, companies, jobs] = await Promise.all([
    prisma.contact.findMany({ where: { userId: user.id }, include: { company: true, messages: true }, orderBy: { createdAt: "desc" } }),
    prisma.outreachTemplate.findMany({ where: { userId: user.id } }),
    prisma.targetCompany.findMany({ where: { userId: user.id } }),
    prisma.job.findMany({ where: { userId: user.id, archived: false } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Network" title="People" lede="A contact list and a four-step sequence. Pitch, two follow-ups, then a final note. You send every one of them." />
      <NetworkDesk
        presetJob={query.job}
        contacts={contacts.map((contact) => {
          const steps = contact.messages.map((message) => message.step);
          const latest = steps.includes("FINAL") ? "FINAL" : steps.includes("FOLLOW_UP_2") ? "FOLLOW_UP_2" : steps.includes("FOLLOW_UP_1") ? "FOLLOW_UP_1" : steps.includes("PITCH") ? "PITCH" : "";
          return {
            id: contact.id,
            name: contact.name,
            title: contact.title,
            type: contact.type,
            company: contact.company?.name ?? "",
            step: nextOutreachStep(latest || null) ?? "done",
          };
        })}
        templates={templates.map((template) => ({ step: template.step, body: template.body }))}
        companies={companies.map((company) => ({ id: company.id, name: company.name }))}
        jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company }))}
      />
    </div>
  );
}
