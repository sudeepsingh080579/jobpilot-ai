"use server";

import { revalidatePath } from "next/cache";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

export async function updateProfile(input: {
  name: string;
  headline: string;
  location: string;
  yearsExperience: number;
  currentTitle: string;
  seniority: string;
  targetCompensation: string;
  timezone: string;
}) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.name.trim()) return fail("Name is required.");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: input.name.trim(),
      headline: input.headline.trim(),
      location: input.location.trim(),
      yearsExperience: Number.isFinite(input.yearsExperience) ? input.yearsExperience : 0,
      currentTitle: input.currentTitle.trim(),
      seniority: input.seniority.trim(),
      targetCompensation: input.targetCompensation.trim(),
      timezone: input.timezone.trim() || "Asia/Kolkata",
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return ok({ id: user.id });
}

export async function saveReminder(input: { title: string; body: string; dueAt: string; jobId?: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.title.trim()) return fail("A reminder needs a title.");
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) return fail("Set a real date.");
  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: input.title.trim(),
      body: input.body.trim(),
      dueAt,
      jobId: input.jobId || null,
    },
  });
  revalidatePath("/reminders");
  revalidatePath("/dashboard");
  return ok({ id: reminder.id });
}

export async function toggleReminder(id: string, done: boolean) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const reminder = await prisma.reminder.findFirst({ where: { id, userId: user.id } });
  if (!reminder) return fail("Reminder not found.");
  await prisma.reminder.update({ where: { id }, data: { done } });
  revalidatePath("/reminders");
  return ok({ id });
}

export async function dispatchDueReminders() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const due = await prisma.reminder.findMany({
    where: { userId: user.id, done: false, dueAt: { lte: new Date() }, notifiedAt: null },
    orderBy: { dueAt: "asc" },
  });
  const subs = await prisma.pushSubscription.findMany({ where: { userId: user.id } });
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  let pushed = 0;
  if (publicKey && privateKey && subs.length && due.length) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:demo@jobpilot.local", publicKey, privateKey);
    for (const reminder of due) {
      const payload = JSON.stringify({ title: reminder.title, body: reminder.body || "A follow-up is due.", url: "/reminders" });
      for (const sub of subs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
          pushed += 1;
        } catch {
          await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
        }
      }
    }
  }
  if (due.length) {
    await prisma.reminder.updateMany({
      where: { id: { in: due.map((item) => item.id) } },
      data: { notifiedAt: new Date() },
    });
  }
  return ok({
    reminders: due.map((item) => ({ id: item.id, title: item.title, body: item.body })),
    pushed,
    pushConfigured: Boolean(publicKey && privateKey),
  });
}
