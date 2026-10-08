import Link from "next/link";
import { NicheStarter } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function NicheStepPage() {
  const user = await requireUser();
  const [journey, niche, jobs] = await Promise.all([
    loadJourney(user.id),
    prisma.niche.findFirst({ where: { userId: user.id }, orderBy: { isPrimary: "desc" } }),
    prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { fitScore: "desc" }, take: 3 }),
  ]);

  return (
    <StepScreen stepId="niche" steps={journey.steps} title="Name the jobs you want" helper="A tight niche beats a wide blast. These are the roles already on your board.">
      {niche && jobs.length > 0 ? (
        <div className="space-y-3">
          <div className="rounded-3xl bg-teal-soft p-5">
            <p className="text-sm font-bold text-teal">Your niche</p>
            <p className="mt-1 text-2xl font-bold text-ink">{niche.title}</p>
            <p className="mt-1 text-sm text-muted">{parseJson<string[]>(niche.locations, []).join(" · ") || "Anywhere you listed"}</p>
          </div>
          {jobs.map((job) => (
            <Link key={job.id} href={`/tracker/${job.id}`} className="desk-card block p-4">
              <p className="font-bold">{job.title}</p>
              <p className="text-sm text-muted">{job.company}</p>
            </Link>
          ))}
        </div>
      ) : (
        <NicheStarter titleHint={user.currentTitle || "Director of Platform"} />
      )}
    </StepScreen>
  );
}
