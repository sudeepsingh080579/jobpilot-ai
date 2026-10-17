import { completeJson } from "@/lib/ai";
import type { AiResult, AiTask } from "@/lib/ai/types";
import { accessFor, type SubState } from "@/lib/billing/state-machine";
import { LIMITS as PLAN_LIMITS, checkAi, entitlementFor, usagePeriod, type Entitlement } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { fail, type Result } from "@/server/result";

type BillingUser = { id: string; trialEndsAt: Date | null };

export async function getEntitlement(user: BillingUser): Promise<Entitlement> {
  const [subscription, account] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId: user.id } }),
    prisma.billingAccount.findUnique({ where: { userId: user.id } }),
  ]);
  const legacy = entitlementFor({ trialEndsAt: user.trialEndsAt, subscription });
  if (legacy.plan === "pro" || !account) return legacy;
  // Provider-agnostic state machine (Razorpay / manual UPI) also grants Pro.
  const access = accessFor({ state: account.state as SubState, trialEndsAt: account.trialEndsAt, periodEnd: account.periodEnd, appliedPayments: account.appliedPayments });
  if (access.paid && access.allowed) {
    return {
      plan: "pro",
      paidPlan: "pro_monthly",
      ...PLAN_LIMITS.pro,
      trialDaysLeft: 0,
      status: account.state,
      cancelAtPeriodEnd: account.state === "cancel_scheduled",
      currentPeriodEnd: account.periodEnd,
    };
  }
  return legacy;
}

export async function aiUsed(userId: string) {
  const row = await prisma.aiUsage.findUnique({ where: { userId_period: { userId, period: usagePeriod() } } });
  return row?.count ?? 0;
}

/**
 * Server-side gate run at the top of every AI action: plan feature, monthly
 * allowance and a per-minute burst limit. Returns a failed Result to hand
 * straight back to the client, or null when the call may proceed.
 */
export async function aiGate(user: BillingUser, task: AiTask): Promise<Result<never> | null> {
  const burst = await rateLimit(`ai:${user.id}`, LIMITS.ai.max, LIMITS.ai.windowMs);
  if (!burst.ok) return fail("Too many AI requests in a minute. Wait a moment and try again.");
  const ent = await getEntitlement(user);
  const decision = checkAi(ent, task, await aiUsed(user.id));
  if (!decision.ok) return fail(`${decision.message} [upgrade]`);
  return null;
}

export class AiLimitError extends Error {}

/** completeJson plus usage metering. Every AI call in server actions goes through here. */
export async function meteredAi<T>(user: BillingUser, task: AiTask, input: unknown): Promise<AiResult<T>> {
  const ent = await getEntitlement(user);
  const decision = checkAi(ent, task, await aiUsed(user.id));
  if (!decision.ok) throw new AiLimitError(decision.message);
  const result = await completeJson<T>(task, input);
  await prisma.aiUsage.upsert({
    where: { userId_period: { userId: user.id, period: usagePeriod() } },
    create: { userId: user.id, period: usagePeriod(), count: 1 },
    update: { count: { increment: 1 } },
  });
  return result;
}
