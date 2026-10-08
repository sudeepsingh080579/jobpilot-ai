import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shell";
import { ResumeIntake } from "@/components/resume-intake";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function ResumesPage() {
  const user = await requireUser();
  const resumes = await prisma.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader eyebrow="Materials" title="Resumes" lede="Upload a PDF or DOCX, paste text, or build from your experience notes. Score, match, and tailor without leaving the desk." />
      <ResumeIntake />
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {resumes.length === 0 ? (
          <EmptyState title="No resume yet" body="Paste the one you use today. The score will tell you what a hiring manager will trip on." />
        ) : null}
        {resumes.map((resume) => (
          <Link key={resume.id} href={`/resumes/${resume.id}`} className="desk-card flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{resume.title}</p>
              <p className="text-sm text-muted">{resume.template}{resume.isPrimary ? " · primary" : ""}</p>
            </div>
            <p className="font-serif text-3xl text-pine">{resume.score ?? "–"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
