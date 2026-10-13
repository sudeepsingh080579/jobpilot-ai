import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Multi-tenant audit. Every Prisma call in app code must either mention userId
 * (directly or through a relation such as contact: { userId }) or match one of
 * the reviewed exceptions below. A new unscoped query fails this test until it
 * is scoped or deliberately added here with a reason.
 */
const REVIEWED: { file: string; pattern: RegExp; why: string }[] = [
  { file: "src/app/(desk)/admin/page.tsx", pattern: /prisma\.(user|subscription)\.(findMany|count)/, why: "admin only, gated by ADMIN_EMAILS" },
  { file: "src/auth.ts", pattern: /prisma\.user\.findUnique\(\{ where: \{ email \} \}\)/, why: "sign-in lookup by email" },
  { file: "src/server/auth-actions.ts", pattern: /prisma\.(user|authToken)\./, why: "sign-up, reset and verify operate on the account itself" },
  { file: "src/server/auth-tokens.ts", pattern: /prisma\.authToken\./, why: "hashed single-use token lookup" },
  { file: "src/server/session.ts", pattern: /prisma\.user\.findUnique\(\{ where: \{ id: session\.user\.id \} \}\)/, why: "the session's own user" },
  { file: "src/app/api/account/export/route.ts", pattern: /prisma\.user\.findUnique\(\{ where: \{ id: session\.user\.id \}/, why: "the session's own user" },
  { file: "src/app/api/stripe/checkout/route.ts", pattern: /prisma\.user\.findUnique\(\{ where: \{ id: session\.user\.id \}/, why: "the session's own user" },
  { file: "src/app/api/billing/checkout/route.ts", pattern: /prisma\.user\.findUnique\(\{ where: \{ id: session\.user\.id \}/, why: "the session's own user" },
  { file: "src/server/billing-store.ts", pattern: /prisma\.(billingEventLog|billingAccount|user)\./, why: "verified webhook processing keyed by provider ids; user resolved from signed payload" },
  { file: "src/server/stripe-store.ts", pattern: /prisma\.(stripeEvent|subscription)\./, why: "webhook writes, keyed by verified Stripe ids" },
  { file: "src/server/privacy-actions.ts", pattern: /prisma\.user\.delete\(\{ where: \{ id: user\.id \} \}\)/, why: "deletes the signed-in user" },
  { file: "", pattern: /prisma\.user\.update\(\{ where: \{ id: user\.id \}/, why: "the signed-in user" },
  // Updates by primary key of a row that was fetched with a userId filter just before.
  { file: "", pattern: /prisma\.\w+\.update\(\{ where: \{ id: (existing|job|company|deck|session|message|row)\.id \}/, why: "row fetched with userId scope first" },
  { file: "", pattern: /prisma\.(reminder|chatMessage|linkedInPost)\.update\(\{ where: \{ id \}/, why: "ownership checked with findFirst({ id, userId }) on the line above" },
  { file: "src/server/account-actions.ts", pattern: /prisma\.(pushSubscription\.deleteMany\(\{ where: \{ id: sub\.id|reminder\.updateMany\(\{ where: \{ id: \{ in: due)/, why: "ids come from userId-scoped queries" },
  { file: "src/server/pipeline-actions.ts", pattern: /prisma\.(stageDraft\.create\(\{ data: \{ jobId: job\.id|outreachMessage\.(findFirst|create)\(\{ (where|data): \{ contactId: contact\.id)/, why: "job/contact fetched with userId scope first" },
];

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]));
}

function prismaCalls(source: string) {
  const calls: string[] = [];
  const re = /prisma\.(\w+)\.(\w+)\(/g;
  let match;
  while ((match = re.exec(source))) {
    let i = match.index + match[0].length;
    let depth = 1;
    while (depth && i < source.length) {
      if (source[i] === "(") depth += 1;
      else if (source[i] === ")") depth -= 1;
      i += 1;
    }
    calls.push(source.slice(match.index, i).replace(/\s+/g, " "));
  }
  return calls;
}

describe("multi-tenant data isolation (static audit)", () => {
  const root = path.resolve(__dirname, "../..");
  const files = walk(path.join(root, "src")).filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts"));

  it("finds the app's Prisma calls", () => {
    const total = files.reduce((n, f) => n + prismaCalls(fs.readFileSync(f, "utf8")).length, 0);
    expect(total).toBeGreaterThan(100);
  });

  it("every query is scoped to the user or is a reviewed exception", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(root, file).split(path.sep).join("/");
      for (const call of prismaCalls(fs.readFileSync(file, "utf8"))) {
        if (/userId/.test(call)) continue;
        if (REVIEWED.some((r) => (!r.file || r.file === rel) && r.pattern.test(call))) continue;
        offenders.push(`${rel}: ${call.slice(0, 160)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("every mutating action checks the session first", () => {
    for (const file of files.filter((f) => f.includes(`${path.sep}server${path.sep}`) && f.endsWith("-actions.ts"))) {
      const source = fs.readFileSync(file, "utf8");
      const chunks = source.split(/\nexport async function /).slice(1);
      for (const chunk of chunks) {
        const name = chunk.slice(0, chunk.indexOf("("));
        // A wrapper whose first statement returns another (checked) action.
        const delegates = /^\)\s*\{\s*return \w+\(/.test(chunk.slice(chunk.indexOf(") {")).replace(/^\)[^{]*/, ")"));
        if (delegates) continue;
        if (/^(loginAction|registerAction|forgotPasswordAction|resetPasswordAction|verifyEmail|logoutAction)$/.test(name)) continue;
        expect(/actionUser\(\)|auth\(\)/.test(chunk), `${path.basename(file)}:${name} must resolve the session user`).toBe(true);
      }
    }
  });
});
