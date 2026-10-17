import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { emailMode } from "@/lib/email";

describe("email verification without a mailer", () => {
  it("detects console mode when no RESEND_API_KEY / SMTP_URL", () => {
    expect(emailMode({})).toBe("console");
    expect(emailMode({ RESEND_API_KEY: "re_x" })).toBe("resend");
    expect(emailMode({ SMTP_URL: "smtp://a:b@h:587" })).toBe("smtp");
  });
  it("never claims a link was sent unless delivered", () => {
    const actions = readFileSync("src/server/auth-actions.ts", "utf8");
    expect(actions).toMatch(/delivered \? "\/verify-email\?sent=1" : "\/verify-email\?sent=failed"/);
    expect(actions).toMatch(/emailMode\(\) === "console" \? \{ emailVerified: new Date\(\) \}/);
    expect(readFileSync("src/app/verify-email/page.tsx", "utf8")).not.toContain("on its way");
  });
});
