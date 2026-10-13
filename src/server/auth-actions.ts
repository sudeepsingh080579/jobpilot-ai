"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { startTrial } from "@/server/billing-store";
import { z } from "zod";
import { auth, signIn, signOut } from "@/auth";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { DEFAULT_TEMPLATES } from "@/lib/outreach/templates";
import { consumeToken, sendResetEmail, sendVerificationEmail } from "@/server/auth-tokens";

const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
  accept: z.literal("on"),
});

async function ip() {
  return clientIp(await headers());
}

function safeNext(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(String(formData.get("next") ?? "/dashboard"));
  const limit = await rateLimit(`login:${await ip()}:${email}`, LIMITS.login.max, LIMITS.login.windowMs);
  if (!limit.ok) redirect("/login?error=rate");
  try {
    await signIn("credentials", { email, password, redirectTo: next });
  } catch (error) {
    if (error instanceof AuthError) redirect("/login?error=1");
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  const limit = await rateLimit(`register:${await ip()}`, LIMITS.register.max, LIMITS.register.windowMs);
  if (!limit.ok) redirect("/register?error=rate");
  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    accept: String(formData.get("accept") ?? ""),
  });
  if (!parsed.success) redirect("/register?error=1");
  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/register?error=exists");
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
      marketingConsent: formData.get("marketing") === "on",
      templates: { create: DEFAULT_TEMPLATES },
    },
  });
  await startTrial(user.id).catch((error) => console.error("trial start failed", error));
  await sendVerificationEmail(user).catch((error) => console.error("verification email failed", error));
  await signIn("credentials", { email, password: parsed.data.password, redirectTo: "/onboarding" });
}

export async function resendVerificationAction() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const limit = await rateLimit(`verify:${session.user.id}`, LIMITS.reset.max, LIMITS.reset.windowMs);
  if (!limit.ok) redirect("/verify-email?sent=rate");
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (user && !user.emailVerified) await sendVerificationEmail(user);
  redirect("/verify-email?sent=1");
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, "verify_email");
  if (!userId) return false;
  await prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } });
  return true;
}

export async function forgotPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const limit = await rateLimit(`reset:${await ip()}`, LIMITS.reset.max, LIMITS.reset.windowMs);
  if (!limit.ok) redirect("/forgot-password?error=rate");
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user) await sendResetEmail(user).catch((error) => console.error("reset email failed", error));
  // Same answer whether or not the account exists, so emails cannot be enumerated.
  redirect("/forgot-password?sent=1");
}

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const limit = await rateLimit(`reset-submit:${await ip()}`, LIMITS.login.max, LIMITS.login.windowMs);
  if (!limit.ok) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=rate`);
  if (password.length < 8 || password.length > 100) redirect(`/reset-password?token=${encodeURIComponent(token)}&error=short`);
  const userId = await consumeToken(token, "reset_password");
  if (!userId) redirect("/reset-password?error=invalid");
  await prisma.user.update({
    where: { id: userId },
    // A reset link proves inbox ownership, so the email counts as verified.
    data: { passwordHash: await bcrypt.hash(password, 12), emailVerified: new Date() },
  });
  await prisma.authToken.deleteMany({ where: { userId, kind: "reset_password" } });
  redirect("/login?reset=1");
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}
