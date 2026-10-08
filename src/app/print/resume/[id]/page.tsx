import { notFound } from "next/navigation";
import { ResumeView } from "@/components/resume-view";
import { PrintButton } from "@/components/print-button";
import { parseJson } from "@/lib/json";
import { emptyResume, type ResumeContent } from "@/lib/resume/types";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function PrintResumePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const resume = await prisma.resume.findFirst({ where: { id, userId: user.id } });
  if (!resume) notFound();
  const content = parseJson<ResumeContent>(resume.content, emptyResume());
  return (
    <div>
      <PrintButton />
      <ResumeView content={content} template={resume.template} />
    </div>
  );
}
