import { readFileSync } from "node:fs";
import { describe, expect, it, vi, afterEach } from "vitest";
import { privacySections, refundSections, termsSections } from "./legal-content";

const all = () => [...termsSections(), ...privacySections(), ...refundSections()].flatMap((s) => [s.heading, ...s.body]).join("\n");
const KEYS = ["LEGAL_ENTITY_NAME", "SUPPORT_EMAIL", "GRIEVANCE_OFFICER_NAME", "GRIEVANCE_OFFICER_EMAIL", "LEGAL_EFFECTIVE_DATE", "AI_PROVIDER_NAME", "BACKUP_RETENTION_DAYS", "LEGAL_JURISDICTION_CITY"];

describe("legal pages", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("have no bracket placeholders or template warnings when env is unset", () => {
    for (const k of KEYS) vi.stubEnv(k, "");
    const text = all();
    expect(text).not.toMatch(/[[\]]/);
    expect(text.toLowerCase()).not.toContain("template");
    expect(text).not.toMatch(/annual plan \(|Pro Annual|Stripe|GDPR|CCPA|VAT|USD/);
    expect(text).toContain("laws of India");
    expect(text).toContain("Grievance Officer");
  });
  it("use operator env values when set", () => {
    vi.stubEnv("LEGAL_ENTITY_NAME", "Acme Pvt Ltd");
    vi.stubEnv("SUPPORT_EMAIL", "help@acme.in");
    vi.stubEnv("LEGAL_JURISDICTION_CITY", "Bengaluru");
    vi.stubEnv("BACKUP_RETENTION_DAYS", "7");
    const text = all();
    expect(text).toContain("Acme Pvt Ltd");
    expect(text).toContain("help@acme.in");
    expect(text).toContain("Bengaluru, India");
    expect(text).toContain("within 7 days");
    expect(text).not.toMatch(/[[\]]/);
  });
  it("legal page shell has no template banner", () => {
    const src = readFileSync("src/components/marketing/legal-page.tsx", "utf8");
    expect(src).not.toMatch(/TEMPLATE|\[Your|\[Effective/);
  });
});

describe("pricing currency", () => {
  const table = readFileSync("src/components/marketing/pricing-table.tsx", "utf8");
  const page = readFileSync("src/app/pricing/page.tsx", "utf8");
  it("is INR only with GST and final amount", () => {
    for (const s of [table, page]) {
      expect(s).not.toMatch(/USD|\bVAT\b|sales tax|\$\d/i);
      expect(s).not.toMatch(/annual/i.source === "" ? /x^/ : /Pro Annual|switch between monthly and annual/i);
    }
    expect(table).toContain("₹1,999");
    expect(table).toContain("incl. 18% GST");
    for (const s of [table, page]) expect(s).not.toMatch(/₹2,000|₹2,360/);
    expect(table).toContain("GST");
    expect(table).toContain("Indian Rupees");
  });
});
