import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shell";
import { ResumeEditor } from "@/components/resume-editor";
import { parseJson } from "@/lib/json";
import { emptyResume, type ResumeContent } from "@/lib/resume/types";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function ResumePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const [resume, jobs] = await Promise.all([
    prisma.resume.findFirst({ where: { id, userId: user.id } }),
    prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { updatedAt: "desc" } }),
  ]);
  if (!resume) notFound();
  const content = parseJson<ResumeContent>(resume.content, emptyResume());
  return (
    <div>
      <PageHeader eyebrow="Resume" title={resume.title} lede="Edit, preview, score, and tailor a copy for one role. PDF export uses the browser print dialog." />
      <ResumeEditor
        resume={{ id: resume.id, title: resume.title, template: resume.template, isPrimary: resume.isPrimary, content }}
        jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company, description: job.description }))}
      />
    </div>
  );
}
