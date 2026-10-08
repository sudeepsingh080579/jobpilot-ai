import { ReferralStep } from "@/components/journey-actions";
import { StepScreen } from "@/components/journey-chrome";
import { prisma } from "@/lib/prisma";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function ReferralStepPage() {
  const user = await requireUser();
  const [journey, contact] = await Promise.all([
    loadJourney(user.id),
    prisma.contact.findFirst({
      where: { userId: user.id },
      include: { company: true, messages: { where: { step: "PITCH" }, take: 1, orderBy: { updatedAt: "desc" } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const message = contact?.messages[0];

  return (
    <StepScreen stepId="referral" steps={journey.steps} title="Ask someone on the inside" helper="A short note you copy into your own mail or LinkedIn. We never send it.">
      <ReferralStep
        contact={
          contact
            ? {
                id: contact.id,
                name: contact.name,
                company: contact.company?.name ?? "",
                body: message?.body ?? "",
                messageId: message?.id ?? "",
              }
            : null
        }
      />
    </StepScreen>
  );
}
