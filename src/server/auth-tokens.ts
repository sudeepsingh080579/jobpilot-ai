import { appUrl } from "@/lib/billing/config";
import { brand } from "@/lib/brand";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { hashToken, newToken, TOKEN_TTL_MS, type TokenKind } from "@/lib/tokens";

export async function issueToken(userId: string, kind: TokenKind) {
  await prisma.authToken.deleteMany({ where: { userId, kind, usedAt: null } });
  const { token, tokenHash } = newToken();
  await prisma.authToken.create({ data: { userId, kind, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS[kind]) } });
  return token;
}

/** Returns the user id when the token is valid, and burns it. */
export async function consumeToken(token: string, kind: TokenKind) {
  if (!token) return null;
  const row = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.kind !== kind || row.usedAt || row.expiresAt < new Date()) return null;
  await prisma.authToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return row.userId;
}

/** Returns { delivered } so callers never claim an email was sent when no mailer is configured. */
export async function sendVerificationEmail(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "verify_email");
  const link = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: `Confirm your email for ${brand.name}`,
    text: `Hi ${user.name},\n\nConfirm your email address to finish setting up ${brand.name}:\n${link}\n\nThe link works for 48 hours. If you did not sign up, ignore this email.`,
  });
}

export async function sendResetEmail(user: { id: string; email: string; name: string }) {
  const token = await issueToken(user.id, "reset_password");
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return sendEmail({
    to: user.email,
    subject: `Reset your ${brand.name} password`,
    text: `Hi ${user.name},\n\nUse this link to choose a new password:\n${link}\n\nThe link works for 1 hour. If you did not ask for this, ignore this email; your password stays the same.`,
  });
}
