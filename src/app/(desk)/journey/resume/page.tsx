import Link from "next/link";
import { JourneyUpload } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function ResumeStepPage() {
  const user = await requireUser();
  const [journey, resume] = await Promise.all([
    loadJourney(user.id),
    prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true }, orderBy: { updatedAt: "desc" } }),
  ]);
  const detail = resume ? parseJson<{ checks?: { id: string; label: string; pass: boolean; hint: string }[] }>(resume.scoreDetail, {}) : {};
  const failed = (detail.checks ?? []).filter((check) => !check.pass);
  const ready = Boolean(resume && (resume.score ?? 0) >= 75);

  return (
    <StepScreen stepId="resume" steps={journey.steps} title="Upload your resume and clear the ATS flags" helper="One file. We score it, then you fix only the lines that would trip a tracking system.">
      {resume ? (
        <div className="rounded-[2rem] bg-gradient-to-br from-indigo to-violet p-6 text-white">
          <p className="text-sm font-bold text-white">Resume score</p>
          <p className="mt-1 text-6xl font-bold">{resume.score ?? "–"}</p>
          <p className="mt-2 text-lg">{ready ? "This one is clear enough to move on." : "Lift this to 75 before the next step."}</p>
          {!ready && failed.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm">
              {failed.slice(0, 4).map((check) => (
                <li key={check.id} className="rounded-2xl bg-white/15 px-3 py-2">
                  {check.hint}
                </li>
              ))}
            </ul>
          ) : null}
          <Link href={`/resumes/${resume.id}`} className="mt-5 inline-flex h-12 items-center rounded-full bg-sun px-5 font-bold text-ink">
            {ready ? "Open the resume" : "Fix the flags"}
          </Link>
        </div>
      ) : (
        <div className="desk-card p-5">
          <p className="mb-3 text-base">PDF, DOCX, or a paste. Five megabytes is the limit.</p>
          <JourneyUpload />
        </div>
      )}
    </StepScreen>
  );
}
