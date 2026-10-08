import Link from "next/link";
import { PageHeader, EmptyState } from "@/components/shell";
import { LetterStart } from "@/components/letter-start";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function LettersPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const [letters, jobs, resumes] = await Promise.all([
    prisma.coverLetter.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
    prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { updatedAt: "desc" } }),
    prisma.resume.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Materials" title="Cover letters" lede="Generated from a saved role and your resume. Edit it, then export a PDF." />
      <LetterStart jobs={jobs.map((job) => ({ id: job.id, title: job.title, company: job.company }))} resumes={resumes.map((resume) => ({ id: resume.id, title: resume.title }))} initialJob={query.job} />
      <div className="mt-4 grid gap-3">
        {letters.length === 0 ? <EmptyState title="No letters yet" body="Pick a saved role. The draft is a starting point, not a finished letter." /> : null}
        {letters.map((letter) => (
          <Link key={letter.id} href={`/letters/${letter.id}`} className="desk-card p-4">
            <p className="font-medium">{letter.title}</p>
            <p className="text-sm text-muted">{letter.template}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
