import type { AiTask } from "@/lib/ai/types";

/**
 * Plans and entitlements. Pure functions only, so they can be unit tested and
 * shared by server actions, API routes and pages.
 *
 * Model: every new account gets a 7-day Pro trial with no card. When the
 * trial ends without a subscription, the account drops to the Free tier
 * (tracker, resumes and a small AI allowance) instead of being locked out.
 */

export type PlanId = "free" | "trial" | "pro";
export type PaidPlan = "pro_monthly" | "pro_annual";
export type Feature = "pitch_deck" | "interview" | "negotiation" | "linkedin" | "outreach" | "cover_letter" | "strategy";

export const TRIAL_DAYS = 7;

export const PRICES: Record<PaidPlan, { label: string; amountUsd: number; interval: "month" | "year"; note: string }> = {
  pro_monthly: { label: "Pro Monthly", amountUsd: 40, interval: "month", note: "Billed monthly. Cancel anytime." },
  pro_annual: { label: "Pro Annual", amountUsd: 400, interval: "year", note: "Billed yearly. About 2 months free." },
};

export const LIMITS: Record<PlanId, { aiPerMonth: number; features: readonly Feature[] }> = {
  free: { aiPerMonth: 15, features: ["strategy", "cover_letter"] },
  trial: { aiPerMonth: 100, features: ["strategy", "cover_letter", "outreach", "linkedin", "interview", "negotiation", "pitch_deck"] },
  pro: { aiPerMonth: 600, features: ["strategy", "cover_letter", "outreach", "linkedin", "interview", "negotiation", "pitch_deck"] },
};

/** Which feature an AI task belongs to. Tasks not listed are allowed on every plan (within the AI limit). */
export const TASK_FEATURE: Partial<Record<AiTask, Feature>> = {
  pitch_deck: "pitch_deck",
  pitch_revise: "pitch_deck",
  company_problems: "pitch_deck",
  interview_questions: "interview",
  interview_feedback: "interview",
  negotiation_script: "negotiation",
  negotiation_turn: "negotiation",
  negotiation_report: "negotiation",
  linkedin_posts: "linkedin",
  linkedin_profile: "linkedin",
  outreach_draft: "outreach",
  stage_draft: "outreach",
};

export const FEATURE_LABEL: Record<Feature, string> = {
  pitch_deck: "Pitch decks",
  interview: "Mock interviews",
  negotiation: "Salary negotiation practice",
  linkedin: "LinkedIn posts and profile",
  outreach: "Referral and follow-up drafts",
  cover_letter: "Cover letters",
  strategy: "Strategy",
};

/** Stripe statuses that grant Pro. past_due keeps access during Stripe's retry window. */
const PRO_STATUSES = new Set(["active", "trialing", "past_due"]);

export type BillingSnapshot = {
  trialEndsAt: Date | null;
  subscription: { status: string; plan: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean } | null;
};

export type Entitlement = {
  plan: PlanId;
  paidPlan: PaidPlan | null;
  aiPerMonth: number;
  features: readonly Feature[];
  trialDaysLeft: number;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
};

export function entitlementFor(snapshot: BillingSnapshot, now = new Date()): Entitlement {
  const sub = snapshot.subscription;
  const periodOk = !sub?.currentPeriodEnd || sub.currentPeriodEnd.getTime() > now.getTime() - 3 * 86400000;
  if (sub && PRO_STATUSES.has(sub.status) && periodOk) {
    return {
      plan: "pro",
      paidPlan: sub.plan === "pro_annual" || sub.plan === "pro_monthly" ? sub.plan : null,
      ...LIMITS.pro,
      trialDaysLeft: 0,
      status: sub.status,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      currentPeriodEnd: sub.currentPeriodEnd,
    };
  }
  const trialMs = snapshot.trialEndsAt ? snapshot.trialEndsAt.getTime() - now.getTime() : 0;
  if (trialMs > 0) {
    return {
      plan: "trial",
      paidPlan: null,
      ...LIMITS.trial,
      trialDaysLeft: Math.ceil(trialMs / 86400000),
      status: "trial",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: snapshot.trialEndsAt,
    };
  }
  return {
    plan: "free",
    paidPlan: null,
    ...LIMITS.free,
    trialDaysLeft: 0,
    status: sub?.status ?? "none",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: null,
  };
}

export function hasFeature(ent: Entitlement, feature: Feature) {
  return ent.features.includes(feature);
}

/** Calendar month key in UTC, e.g. "2026-10". */
export function usagePeriod(now = new Date()) {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type AiDecision = { ok: true } | { ok: false; reason: "feature" | "quota"; message: string };

export function checkAi(ent: Entitlement, task: AiTask, used: number): AiDecision {
  const feature = TASK_FEATURE[task];
  if (feature && !hasFeature(ent, feature)) {
    return { ok: false, reason: "feature", message: `${FEATURE_LABEL[feature]} are part of Pro. Upgrade on the Pricing page to unlock them.` };
  }
  if (used >= ent.aiPerMonth) {
    return {
      ok: false,
      reason: "quota",
      message:
        ent.plan === "pro"
          ? `You have used all ${ent.aiPerMonth} AI actions for this month. The allowance resets on the 1st (UTC).`
          : `You have used all ${ent.aiPerMonth} AI actions on the ${ent.plan === "trial" ? "trial" : "Free plan"} this month. Upgrade to Pro for ${LIMITS.pro.aiPerMonth} a month.`,
    };
  }
  return { ok: true };
}

/** Monthly recurring revenue contribution in minor units for one subscription item. */
export function monthlyCents(unitAmount: number, interval: string, intervalCount = 1) {
  if (interval === "year") return Math.round(unitAmount / (12 * intervalCount));
  if (interval === "week") return Math.round((unitAmount * 52) / 12 / intervalCount);
  if (interval === "day") return Math.round((unitAmount * 365) / 12 / intervalCount);
  return Math.round(unitAmount / intervalCount);
}
