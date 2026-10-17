"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { actionUser } from "@/server/session";
import { approveUpiPayment, cancelAtPeriodEnd, rejectUpiPayment, submitUpiPayment, type UpiResult } from "@/server/upi-store";
import { rateLimit } from "@/lib/rate-limit";

export async function submitUtrAction(_prev: UpiResult | null, form: FormData): Promise<UpiResult> {
  const user = await actionUser();
  if (!user) return { ok: false, error: "Please sign in again." };
  const rl = await rateLimit(`upi:${user.id}`, 10, 60 * 60 * 1000);
  if (!rl.ok) return { ok: false, error: "Too many attempts. Try again later." };
  const r = await submitUpiPayment(user.id, String(form.get("ref") ?? ""), String(form.get("utr") ?? ""));
  revalidatePath("/settings/billing");
  revalidatePath("/settings/billing/upi");
  return r;
}

export async function approvePaymentAction(form: FormData) {
  const admin = await actionUser();
  if (!admin || !isAdmin(admin.email)) throw new Error("Not allowed");
  await approveUpiPayment(String(form.get("id")), admin.email);
  revalidatePath("/admin/payments");
}

export async function rejectPaymentAction(form: FormData) {
  const admin = await actionUser();
  if (!admin || !isAdmin(admin.email)) throw new Error("Not allowed");
  await rejectUpiPayment(String(form.get("id")), admin.email, String(form.get("note") ?? ""));
  revalidatePath("/admin/payments");
}

export async function cancelPlanAction() {
  const user = await actionUser();
  if (!user) return;
  await cancelAtPeriodEnd(user.id);
  revalidatePath("/settings/billing");
}
