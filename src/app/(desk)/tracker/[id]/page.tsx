import { notFound } from "next/navigation";
import { JobDetail } from "@/components/job-detail";
import { PageHeader } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    include: { drafts: { orderBy: { createdAt: "desc" } }, contacts: true },
  });
  if (!job) notFound();
  const fit = parseJson<{ narrative?: string }>(job.fitDetail, {});
  const seen = new Set<string>();
  const drafts = job.drafts.filter((draft) => {
    if (seen.has(draft.kind)) return false;
    seen.add(draft.kind);
    return true;
  });
  return (
    <div>
      <PageHeader eyebrow={job.company} title={job.title} lede={`${job.source} · ${job.status}`} />
      <JobDetail
        job={{
          id: job.id,
          title: job.title,
          company: job.company,
          status: job.status,
          notes: job.notes,
          description: job.description,
          keywords: parseJson(job.keywords, []),
          fitScore: job.fitScore,
          fitBand: job.fitBand,
          fitNarrative: fit.narrative ?? "",
          location: job.location,
          salary: job.salary,
          url: job.url,
        }}
        drafts={drafts.map((draft) => ({ id: draft.id, kind: draft.kind, content: draft.content }))}
        contacts={job.contacts.map((contact) => ({ id: contact.id, name: contact.name, title: contact.title }))}
      />
    </div>
  );
}
