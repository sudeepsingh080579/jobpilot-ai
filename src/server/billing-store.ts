import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { accessFor, initialSnapshot, transition, type BillingEvent, type Snapshot, type SubState } from "@/lib/billing/state-machine";
import type { NormalizedEvent, ProviderId } from "@/lib/billing/providers/types";

type Row = { state: string; trialEndsAt: Date | null; periodEnd: Date | null; appliedPayments: string[] };
const snap = (r: Row | null): Snapshot =>
  r ? { state: r.state as SubState, trialEndsAt: r.trialEndsAt, periodEnd: r.periodEnd, appliedPayments: r.appliedPayments } : initialSnapshot();

export async function getBillingSnapshot(userId: string) {
  return snap(await prisma.billingAccount.findUnique({ where: { userId } }));
}

export async function getAccess(userId: string, now = new Date()) {
  return accessFor(await getBillingSnapshot(userId), now);
}

/**
 * The only writer of BillingAccount. Runs the pure state machine inside a
 * serializable transaction with optimistic versioning, so concurrent webhooks
 * cannot double-apply a payment.
 */
export async function applyBillingEvent(userId: string, event: BillingEvent, extra: { provider?: ProviderId; subscriptionId?: string | null; customerId?: string | null } = {}) {
  return prisma.$transaction(
    async (tx) => {
      const row = await tx.billingAccount.findUnique({ where: { userId } });
      const before = snap(row);
      const res = transition(before, event);
      if (!res.ok) return { ok: false as const, error: res.error, from: before.state, to: before.state };
      const data = {
        state: res.snapshot.state,
        trialEndsAt: res.snapshot.trialEndsAt,
        periodEnd: res.snapshot.periodEnd,
        appliedPayments: res.snapshot.appliedPayments,
        ...(extra.provider ? { provider: extra.provider } : {}),
        ...(extra.subscriptionId ? { providerSubscriptionId: extra.subscriptionId } : {}),
        ...(extra.customerId ? { providerCustomerId: extra.customerId } : {}),
      };
      if (!row) await tx.billingAccount.create({ data: { userId, ...data } });
      else if (res.changed || extra.subscriptionId || extra.customerId) {
        const u = await tx.billingAccount.updateMany({ where: { userId, version: (row as { version: number }).version }, data: { ...data, version: { increment: 1 } } });
        if (u.count !== 1) throw new Error("Concurrent billing update; retry");
      }
      return { ok: true as const, from: before.state, to: res.snapshot.state };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

/** Starts the one-time 7-day no-card trial. Safe to call repeatedly. */
export async function startTrial(userId: string, now = new Date()) {
  return applyBillingEvent(userId, { type: "TRIAL_STARTED", at: now, days: TRIAL_DAYS });
}

/** Cron/read-path reconciliation: expire trials and close finished periods. */
export async function reconcile(userId: string, now = new Date()) {
  const s = await getBillingSnapshot(userId);
  if (s.state === "trialing" && s.trialEndsAt && s.trialEndsAt <= now) return applyBillingEvent(userId, { type: "TRIAL_ENDED" });
  if (s.state === "cancel_scheduled" && s.periodEnd && s.periodEnd <= now) return applyBillingEvent(userId, { type: "PERIOD_ENDED" });
  return { ok: true as const, from: s.state, to: s.state };
}

/** Idempotent webhook processing: each provider event id is applied at most once. */
export async function processWebhookEvent(provider: ProviderId, ev: NormalizedEvent) {
  const logId = `${provider}:${ev.id}`;
  if (await prisma.billingEventLog.findUnique({ where: { id: logId } })) return { duplicate: true as const };
  let userId = ev.userId;
  if (!userId && ev.subscriptionId) userId = (await prisma.billingAccount.findUnique({ where: { providerSubscriptionId: ev.subscriptionId } }))?.userId ?? null;
  if (userId && !(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) userId = null;
  let outcome = "ignored";
  let from: string | null = null;
  let to: string | null = null;
  if (userId && ev.event) {
    const r = await applyBillingEvent(userId, ev.event, { provider, subscriptionId: ev.subscriptionId, customerId: ev.customerId });
    outcome = r.ok ? "applied" : `rejected: ${r.error}`;
    from = r.from;
    to = r.to;
  } else if (ev.event) outcome = "unmatched_user";
  try {
    await prisma.billingEventLog.create({ data: { id: logId, provider, type: ev.providerType, userId, fromState: from, toState: to, outcome } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { duplicate: true as const };
    throw e;
  }
  return { duplicate: false as const, outcome, from, to };
}
