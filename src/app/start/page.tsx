import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SiteFooter, SiteHeader } from "@/components/marketing/site-chrome";
import { StartFlow } from "@/components/start-flow";

export const metadata: Metadata = {
  title: "Upload your resume: free ATS check and enhancement",
  description: "Upload a PDF or DOCX resume, see its ATS score, get an ATS-compliant version built only from your own facts, and download it as PDF or DOCX.",
};
export const dynamic = "force-dynamic";

export default async function StartPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const versions = userId
    ? await prisma.resumeVersion.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8, include: { resume: { select: { fileName: true } } } })
    : [];
  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader signedIn={Boolean(userId)} />
      <main className="mx-auto max-w-5xl px-5 pb-10 pt-4">
        <StartFlow signedIn={Boolean(userId)} />
        {versions.length ? (
          <section className="desk-card mt-8 space-y-2 p-5" data-testid="versions">
            <h2 className="text-lg font-bold">Your enhanced resume versions</h2>
            <p className="text-xs text-muted">Your original upload is always kept unchanged. Each enhancement is saved as a new version.</p>
            <ul className="space-y-1 text-sm">
              {versions.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">v{v.version}</span> · {v.targetRole || "General"} · ATS {v.atsBefore} → {v.atsAfter} · from {v.resume.fileName} · {v.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}
                  <a className="font-semibold text-indigo underline" href={`/api/resumes/versions/${v.id}/download?format=pdf`}>PDF</a>
                  <a className="font-semibold text-indigo underline" href={`/api/resumes/versions/${v.id}/download?format=docx`}>DOCX</a>
                </li>
              ))}
            </ul>
            <p className="text-sm"><Link href="/hunt" className="font-semibold text-indigo underline">Go to the Job Hunt Agent →</Link></p>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
