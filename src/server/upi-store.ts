import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICE_PAISE } from "@/lib/billing/pricing";
import { nextPeriodEnd, REF_RE, validateUtr } from "@/lib/billing/upi";
import { applyBillingEvent, getBillingSnapshot } from "@/server/billing-store";

export type UpiResult = { ok: true; message: string } | { ok: false; error: string };

export async function submitUpiPayment(userId: string, ref: string, rawUtr: string): Promise<UpiResult> {
  if (!REF_RE.test(ref)) return { ok: false, error: "Payment reference is invalid. Reload the page and try again." };
  const v = validateUtr(rawUtr);
  if (!v.ok) return v;
  const pending = await prisma.upiPayment.findFirst({ where: { userId, status: "pending" } });
  if (pending) return { ok: false, error: "You already have a payment awaiting verification." };
  try {
    await prisma.upiPayment.create({ data: { userId, ref, utr: v.utr, amountPaise: PLAN_PRICE_PAISE } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "This UTR has already been submitted." };
    throw e;
  }
  return { ok: true, message: "Payment submitted. Status: pending verification (typically within 24 hours)." };
}

async function audit(actorEmail: string, action: string, targetId: string, detail: string) {
  await prisma.adminAuditLog.create({ data: { actorEmail, action, targetType: "UpiPayment", targetId, detail } });
}

/** Approve: activates Pro for 30 days through the state machine. Idempotent (paymentId upi:<id>). */
export async function approveUpiPayment(paymentId: string, actorEmail: string, now = new Date()): Promise<UpiResult> {
  const p = await prisma.upiPayment.findUnique({ where: { id: paymentId } });
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.status === "approved") return { ok: true, message: "Already approved." };
  if (p.status !== "pending") return { ok: false, error: `Payment is ${p.status}.` };
  const snap = await getBillingSnapshot(p.userId);
  const periodEnd = nextPeriodEnd(snap.periodEnd, now);
  const r = await applyBillingEvent(p.userId, { type: "PAYMENT_SUCCEEDED", paymentId: `upi:${p.id}`, periodEnd }, { provider: "upi_manual" });
  if (!r.ok) return { ok: false, error: r.error };
  const after = await getBillingSnapshot(p.userId);
  const u = await prisma.upiPayment.updateMany({
    where: { id: p.id, status: "pending" },
    data: { status: "approved", reviewedBy: actorEmail, reviewedAt: now, periodEnd: after.periodEnd },
  });
  if (u.count === 1) await audit(actorEmail, "upi.approve", p.id, `utr=${p.utr} ${r.from}->${r.to} until=${after.periodEnd?.toISOString()}`);
  return { ok: true, message: "Approved. Pro is active." };
}

export async function rejectUpiPayment(paymentId: string, actorEmail: string, note: string, now = new Date()): Promise<UpiResult> {
  const u = await prisma.upiPayment.updateMany({
    where: { id: paymentId, status: "pending" },
    data: { status: "rejected", reviewedBy: actorEmail, reviewedAt: now, note: note.slice(0, 300) },
  });
  if (u.count !== 1) return { ok: false, error: "Payment is not pending." };
  await audit(actorEmail, "upi.reject", paymentId, note.slice(0, 300));
  return { ok: true, message: "Rejected." };
}

/** Cancel = no renewal. Access continues until periodEnd. */
export async function cancelAtPeriodEnd(userId: string): Promise<UpiResult> {
  const r = await applyBillingEvent(userId, { type: "CANCEL_REQUESTED", atPeriodEnd: true });
  return r.ok ? { ok: true, message: "Cancelled. You keep Pro until the end of your paid period." } : { ok: false, error: "There is no active plan to cancel." };
}
