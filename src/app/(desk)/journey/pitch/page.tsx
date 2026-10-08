import { PitchStep } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function PitchStepPage() {
  const user = await requireUser();
  const [journey, deck] = await Promise.all([
    loadJourney(user.id),
    prisma.pitchDeck.findFirst({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <StepScreen stepId="pitch" steps={journey.steps} title="Reach companies that are not posting" helper="Pick one likely problem. You get a short deck you can edit and print.">
      <PitchStep deck={deck ? { id: deck.id, companyName: deck.companyName, problem: deck.problem } : null} />
    </StepScreen>
  );
}
