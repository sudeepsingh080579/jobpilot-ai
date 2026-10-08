import { journeyState } from "@/lib/journey";
import { prisma } from "@/lib/prisma";

export async function loadJourney(userId: string) {
  const [resume, tailored, niche, jobs, outreach, decks, negotiations] = await Promise.all([
    prisma.resume.findFirst({ where: { userId, isPrimary: true }, select: { score: true } }),
    prisma.resume.count({ where: { userId, isPrimary: false } }),
    prisma.niche.count({ where: { userId } }),
    prisma.job.count({ where: { userId, archived: false } }),
    prisma.outreachMessage.count({ where: { contact: { userId } } }),
    prisma.pitchDeck.count({ where: { userId } }),
    prisma.negotiationSession.count({ where: { userId } }),
  ]);
  return journeyState({
    resumeReady: Boolean(resume && (resume.score ?? 0) >= 75),
    nicheReady: niche > 0 && jobs > 0,
    tailored: tailored > 0,
    referralReady: outreach > 0,
    pitchReady: decks > 0,
    negotiateReady: negotiations > 0,
  });
}
