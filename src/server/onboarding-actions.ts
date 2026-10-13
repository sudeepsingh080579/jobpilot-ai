"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { STEPS, validatePreferences, type PreferencesInput } from "@/lib/onboarding/preferences";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

/** Saves a partial draft at any step; `complete` enforces required answers. */
export async function savePreferences(input: Partial<PreferencesInput>, step: number, complete = false) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const v = validatePreferences(input as Record<string, unknown>, { requireComplete: complete });
  if (!v.ok) return fail(v.errors.join(" "));
  await prisma.$transaction([
    prisma.jobPreferences.upsert({ where: { userId: user.id }, create: { userId: user.id, ...v.value }, update: v.value }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingStep: Math.max(0, Math.min(STEPS.length, Math.trunc(step))),
        ...(complete ? { onboardingCompletedAt: new Date(), yearsExperience: v.value.experienceYears } : {}),
      },
    }),
  ]);
  revalidatePath("/onboarding");
  return ok(undefined);
}
