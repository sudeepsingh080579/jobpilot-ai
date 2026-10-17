import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PLAN_PRICE_PAISE } from "@/lib/billing/pricing";
import { nextPeriodEnd, REF_RE, validateUtr } from "@/lib/billing/upi";
import { applyBillingEvent, getBillingSnapshot } from "@/server/billing-store";
import { accessFor } from "@/lib/billing/state-machine";
import { formatInr } from "@/lib/billing/pricing";
import { sendEmail } from "@/lib/email";

export type UpiResult = { ok: true; message: string } | { ok: false; error: string };

const IST = (d: Date) => d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";

export function adminNotifyEmail(env: Record<string, string | undefined> = process.env) {
  return env.ADMIN_NOTIFY_EMAIL?.trim() || "futurestacklearning@gmail.com";
}

/** Always stored in DB (feed on /admin/payments); emailed when RESEND_API_KEY or SMTP_URL is set. */
export async function notifyAdmin(kind: string, subject: string, body: string) {
  const to = adminNotifyEmail();
  let sentVia = "console";
  let error = "";
  try {
    sentVia = (await sendEmail({ to, subject, text: body })).mode;
  } catch (e) {
    sentVia = "failed";
    error = e instanceof Error ? e.message.slice(0, 300) : "send failed";
    console.error("[admin-notify]", error);
  }
  await prisma.adminNotification.create({ data: { kind, to, subject, body, sentVia, error } });
}

/**
 * Valid UTR → Pro for 30 days immediately (same idempotent state-machine path, paymentId upi:<id>).
 * One payment per paid period: blocked while Pro from a previous payment is still running.
 */
export async function submitUpiPayment(userId: string, ref: string, rawUtr: string, now = new Date()): Promise<UpiResult> {
  if (!REF_RE.test(ref)) return { ok: false, error: "Payment reference is invalid. Reload the page and try again." };
  const v = validateUtr(rawUtr);
  if (!v.ok) return v;
  const snap = await getBillingSnapshot(userId);
  if (accessFor(snap, now).paid && accessFor(snap, now).allowed) return { ok: false, error: "Your Pro period is still active. You can pay again after it ends." };
  let p;
  try {
    p = await prisma.upiPayment.create({ data: { userId, ref, utr: v.utr, amountPaise: PLAN_PRICE_PAISE, status: "processing" } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "This UTR has already been submitted." };
    throw e;
  }
  const r = await applyBillingEvent(userId, { type: "PAYMENT_SUCCEEDED", paymentId: `upi:${p.id}`, periodEnd: nextPeriodEnd(snap.periodEnd, now) }, { provider: "upi_manual" });
  if (!r.ok) {
    await prisma.upiPayment.delete({ where: { id: p.id } });
    return { ok: false, error: "Could not activate Pro. Please try again." };
  }
  const after = await getBillingSnapshot(userId);
  await prisma.upiPayment.update({ where: { id: p.id }, data: { status: "auto_activated", periodEnd: after.periodEnd, reviewedBy: "system", reviewedAt: now } });
  await audit("system", "upi.auto_activate", p.id, `utr=${v.utr} ${r.from}->${r.to} until=${after.periodEnd?.toISOString()}`);
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  await notifyAdmin(
    "upi.auto_activated",
    `JobPilot: UPI payment ${formatInr(p.amountPaise)} — ${user?.email}`,
    [
      "A UPI payment was submitted and Pro was activated automatically. Check it arrived in your account; revoke at /admin/payments if not.",
      `User: ${user?.name} <${user?.email}>`,
      `Amount: ${formatInr(p.amountPaise)}`,
      `UTR: ${v.utr}`,
      `Payment ref: ${ref}`,
      `Time: ${IST(now)}`,
      `Pro until: ${after.periodEnd ? IST(after.periodEnd) : "-"}`,
    ].join("\n"),
  ).catch((e) => console.error("[admin-notify] store failed", e));
  return { ok: true, message: `Pro is active until ${after.periodEnd ? IST(after.periodEnd) : ""}.` };
}

async function audit(actorEmail: string, action: string, targetId: string, detail: string) {
  await prisma.adminAuditLog.create({ data: { actorEmail, action, targetType: "UpiPayment", targetId, detail } });
}

/** Revoke (fake/unreceived UTR): mark rejected and end Pro immediately. Idempotent. */
export async function revokeUpiPayment(paymentId: string, actorEmail: string, note: string, now = new Date()): Promise<UpiResult> {
  const p = await prisma.upiPayment.findUnique({ where: { id: paymentId } });
  if (!p) return { ok: false, error: "Payment not found." };
  if (p.status === "rejected") return { ok: true, message: "Already revoked." };
  const r = await applyBillingEvent(p.userId, { type: "CANCEL_REQUESTED", atPeriodEnd: false });
  const u = await prisma.upiPayment.updateMany({
    where: { id: p.id, status: { not: "rejected" } },
    data: { status: "rejected", reviewedBy: actorEmail, reviewedAt: now, note: note.slice(0, 300) },
  });
  if (u.count === 1) await audit(actorEmail, "upi.revoke", p.id, `utr=${p.utr} ${r.from}->${r.to} ${note.slice(0, 200)}`);
  return { ok: true, message: "Revoked. Pro has ended for this user." };
}

/** Cancel = no renewal. Access continues until periodEnd. */
export async function cancelAtPeriodEnd(userId: string): Promise<UpiResult> {
  const r = await applyBillingEvent(userId, { type: "CANCEL_REQUESTED", atPeriodEnd: true });
  return r.ok ? { ok: true, message: "Cancelled. You keep Pro until the end of your paid period." } : { ok: false, error: "There is no active plan to cancel." };
}
