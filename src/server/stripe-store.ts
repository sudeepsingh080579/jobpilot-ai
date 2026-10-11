import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { appUrl } from "@/lib/billing/config";
import type { BillingStore } from "@/lib/billing/webhook";

/** Prisma-backed store for the webhook handler. */
export const prismaBillingStore: BillingStore = {
  async markEvent(id, type) {
    try {
      await prisma.stripeEvent.create({ data: { id, type } });
      return false;
    } catch {
      return true;
    }
  },
  async unmarkEvent(id) {
    await prisma.stripeEvent.deleteMany({ where: { id } });
  },
  async userIdForCustomer(customerId) {
    const row = await prisma.subscription.findUnique({ where: { stripeCustomerId: customerId }, select: { userId: true } });
    return row?.userId ?? null;
  },
  async userExists(userId) {
    return Boolean(await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }));
  },
  async upsertSubscription(record) {
    const { userId, ...data } = record;
    await prisma.subscription.upsert({ where: { userId }, create: { userId, ...data }, update: data });
  },
  async setStatusByCustomer(customerId, status) {
    await prisma.subscription.updateMany({ where: { stripeCustomerId: customerId }, data: { status } });
  },
  async notifyPaymentFailed(userId, url) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;
    await sendEmail({
      to: user.email,
      subject: "Your JobPilot AI payment did not go through",
      text: `Hi ${user.name},\n\nWe could not charge your card for JobPilot AI Pro. Stripe will retry automatically. To keep Pro, update your payment method:\n${url ?? `${appUrl()}/settings/billing`}\n`,
    }).catch(() => undefined);
  },
};
