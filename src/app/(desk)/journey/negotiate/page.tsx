import { NegotiateStep } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function NegotiateStepPage() {
  const user = await requireUser();
  const [journey, session, offer] = await Promise.all([
    loadJourney(user.id),
    prisma.negotiationSession.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.job.findFirst({ where: { userId: user.id, status: "OFFER" }, orderBy: { updatedAt: "desc" } }),
  ]);

  return (
    <StepScreen stepId="negotiate" steps={journey.steps} title="Practice the counter before the call" helper="Name the number you want, the floor, and what they offered. Then read the script out loud.">
      <NegotiateStep
        existingId={session?.id ?? ""}
        script={session?.script ?? ""}
        defaults={{
          title: offer ? `${offer.title} at ${offer.company}` : user.currentTitle || "Offer conversation",
          target: user.targetCompensation || "",
          floor: "",
          offer: offer?.salary || "",
          jobId: offer?.id ?? "",
        }}
      />
    </StepScreen>
  );
}
