import { describe, expect, it } from "vitest";
import { isAdmin } from "@/lib/admin";
import { emailMode } from "@/lib/email";
import { scrub } from "@/lib/export";
import { memoryLimit } from "@/lib/rate-limit";
import { securityHeaders } from "@/lib/security-headers";
import { hashToken, newToken } from "@/lib/tokens";
import { formatMoney } from "@/lib/utils";

describe("business readiness helpers", () => {
  it("rate limiter blocks after max within a window and resets after", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i += 1) expect(memoryLimit(key, 3, 1000, 0).ok).toBe(true);
    expect(memoryLimit(key, 3, 1000, 10).ok).toBe(false);
    expect(memoryLimit(key, 3, 1000, 2000).ok).toBe(true);
  });

  it("admin gate is driven by ADMIN_EMAILS, case-insensitive", () => {
    expect(isAdmin("Owner@Example.com", "owner@example.com, ops@example.com")).toBe(true);
    expect(isAdmin("someone@example.com", "owner@example.com")).toBe(false);
    expect(isAdmin("owner@example.com", "")).toBe(false);
  });

  it("email sender falls back to console", () => {
    expect(emailMode({})).toBe("console");
    expect(emailMode({ RESEND_API_KEY: "re_x" })).toBe("resend");
    expect(emailMode({ SMTP_URL: "smtp://a:b@host:587" })).toBe("smtp");
  });

  it("tokens are random and stored hashed", () => {
    const a = newToken();
    const b = newToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });

  it("data export strips secrets", () => {
    const out = scrub({ email: "a@b.c", passwordHash: "x", resumes: [{ id: "r", fileData: Buffer.from("x") }] });
    expect(out).toEqual({ email: "a@b.c", resumes: [{ id: "r" }] });
  });

  it("security headers include CSP, HSTS, frame and sniffing protection", () => {
    const keys = securityHeaders(false).map((h) => h.key);
    expect(keys).toEqual(expect.arrayContaining(["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"]));
    expect(securityHeaders(false).find((h) => h.key === "Content-Security-Policy")?.value).not.toContain("unsafe-eval");
  });

  it("money defaults to USD and still formats INR", () => {
    expect(formatMoney(40)).toBe("$40");
    expect(formatMoney(150000, "INR")).toBe("₹1,50,000");
    expect(formatMoney(400, "EUR")).toContain("400");
  });
});
