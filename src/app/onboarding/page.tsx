import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { getAccess } from "@/server/billing-store";

export const metadata = { title: "Set up your job search" };

export default async function OnboardingPage() {
  const user = await requireUser();
  const [prefs, resumes, access] = await Promise.all([
    prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    prisma.resume.findMany({ where: { userId: user.id }, select: { id: true, title: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    getAccess(user.id),
  ]);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <p className="mb-4 text-sm font-semibold text-ink/70" data-testid="trial-status">
        {access.trial ? `Free trial: ${access.trialDaysLeft} day${access.trialDaysLeft === 1 ? "" : "s"} left. No card needed.` : access.paid ? "Pro subscription active." : "Your trial has ended."}
      </p>
      <OnboardingWizard
        initialStep={Math.min(user.onboardingStep, 6)}
        resumes={resumes}
        initial={{
          targetRoles: prefs?.targetRoles ?? [],
          locations: prefs?.locations ?? [],
          remoteIndia: prefs?.remoteIndia ?? false,
          remoteInternational: prefs?.remoteInternational ?? false,
          workArrangements: prefs?.workArrangements ?? [],
          employmentTypes: prefs?.employmentTypes ?? [],
          experienceYears: prefs?.experienceYears ?? user.yearsExperience,
          currentCtcLakhs: prefs?.currentCtcLakhs ?? null,
          expectedCtcLakhs: prefs?.expectedCtcLakhs ?? null,
          noticePeriodDays: prefs?.noticePeriodDays ?? null,
          industries: prefs?.industries ?? [],
          skills: prefs?.skills ?? [],
          willingToRelocate: prefs?.willingToRelocate ?? false,
        }}
      />
    </main>
  );
}
