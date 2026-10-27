import bcrypt from "bcryptjs";
import { z } from "zod";
import { TRIAL_DAYS } from "@/lib/billing/plans";
import { emailMode } from "@/lib/email";
import { DEFAULT_TEMPLATES } from "@/lib/outreach/templates";
import { prisma } from "@/lib/prisma";
import { clientIp, LIMITS, rateLimit } from "@/lib/rate-limit";
import { startTrial } from "@/server/billing-store";
import { sendVerificationEmail } from "@/server/auth-tokens";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(100),
  accept: z.literal(true),
  marketing: z.boolean().optional(),
});

/**
 * Account creation for the public /start flow (same rules as the /register form, but JSON so the
 * browser can keep the chosen file in memory and sign in without leaving the page).
 */
export async function POST(request: Request) {
  const limit = await rateLimit(`register:${clientIp(request.headers)}`, LIMITS.register.max, LIMITS.register.windowMs);
  if (!limit.ok) return Response.json({ error: "Too many sign-ups from this network. Try again in an hour.", code: "rate" }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your name, a valid email, a password of at least 8 characters, and accept the terms.", code: "invalid" }, { status: 400 });
  const email = parsed.data.email.toLowerCase();
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    return Response.json({ error: "An account with this email already exists. Sign in instead.", code: "exists" }, { status: 409 });
  }
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86400000),
      marketingConsent: parsed.data.marketing === true,
      // No mailer configured: verification cannot be delivered, so it must not gate the account.
      ...(emailMode() === "console" ? { emailVerified: new Date() } : {}),
      templates: { create: DEFAULT_TEMPLATES },
    },
  });
  await startTrial(user.id).catch((error) => console.error("trial start failed", error));
  if (!user.emailVerified) await sendVerificationEmail(user).catch((error) => console.error("verification email failed", error));
  return Response.json({ ok: true });
}
