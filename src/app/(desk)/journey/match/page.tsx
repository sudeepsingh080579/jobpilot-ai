import { MatchStep } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function MatchStepPage() {
  const user = await requireUser();
  const [journey, resume, jobs] = await Promise.all([
    loadJourney(user.id),
    prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true }, select: { id: true } }),
    prisma.job.findMany({
      where: { userId: user.id, archived: false },
      orderBy: { fitScore: "desc" },
      take: 4,
      select: { id: true, title: true, company: true },
    }),
  ]);

  return (
    <StepScreen stepId="match" steps={journey.steps} title="Match one job and tighten the resume" helper="Pick a role. One tap writes a tailored copy and leaves your original alone.">
      <MatchStep resumeId={resume?.id ?? null} jobs={jobs} />
    </StepScreen>
  );
}
