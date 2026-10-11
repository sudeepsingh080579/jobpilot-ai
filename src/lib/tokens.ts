import { createHash, randomBytes } from "node:crypto";

export type TokenKind = "verify_email" | "reset_password";

export const TOKEN_TTL_MS: Record<TokenKind, number> = {
  verify_email: 48 * 60 * 60_000,
  reset_password: 60 * 60_000,
};

export function newToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
