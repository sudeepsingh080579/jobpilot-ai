import { describe, expect, it } from "vitest";
import { dedupKey, detectCountries, locationDecision, needsInputFor, scoreRole, sponsorshipSignal, titleRelevance, type HuntPrefs } from "./rules";
import { tailorResume, validateTailored } from "./tailor";
import { buildAnswers, hasSalaryAnswer } from "./answers";
import { parseCompanyCsv, suggestCompanies, VERIFIED_COMPANIES } from "./catalog";
import { emptyResume, type ResumeContent } from "@/lib/resume/types";

const prefs: HuntPrefs = { allowedCountries: ["India", "United Arab Emirates", "United Kingdom", "Germany", "Netherlands"], allowUsWithSponsorship: true, needsSponsorship: false, homeCountry: "India" };

describe("location rules", () => {
  it("detects countries", () => {
    expect(detectCountries("Bengaluru, India")).toEqual(["India"]);
    expect(detectCountries("San Francisco, CA")).toContain("United States");
    expect(detectCountries("London; Amsterdam")).toEqual(expect.arrayContaining(["United Kingdom", "Netherlands"]));
    expect(detectCountries("Remote")).toEqual([]);
  });
  it("accepts allowed countries in any work mode", () => {
    expect(locationDecision("Dubai, UAE", "Hybrid", "", prefs)).toMatchObject({ ok: true, country: "United Arab Emirates" });
    expect(locationDecision("Remote - Germany", "", "", prefs)).toMatchObject({ ok: true, country: "Germany" });
  });
  it("skips US roles unless sponsorship is mentioned", () => {
    expect(locationDecision("New York, NY", "", "Great team.", prefs)).toMatchObject({ ok: false });
    expect(locationDecision("New York, NY", "", "Visa sponsorship is available for this role.", prefs)).toMatchObject({ ok: true, country: "United States" });
  });
  it("skips other countries and unspecified remote", () => {
    expect(locationDecision("Toronto, Canada", "", "", prefs).ok).toBe(false);
    expect(locationDecision("Remote", "", "", prefs).ok).toBe(false);
  });
  it("skips explicit no-sponsorship abroad when the user needs it", () => {
    const p = { ...prefs, needsSponsorship: true };
    expect(sponsorshipSignal("We are unable to sponsor visas for this role")).toBe("no");
    expect(locationDecision("London, UK", "", "We do not offer visa sponsorship.", p)).toMatchObject({ ok: false });
    expect(locationDecision("Pune, India", "", "We do not offer visa sponsorship.", p)).toMatchObject({ ok: true });
  });
});

describe("scoring and dedup", () => {
  it("title relevance needs core-word overlap", () => {
    expect(titleRelevance("Senior Product Manager, Payments", ["Product Manager"])).toBeGreaterThan(0.6);
    expect(titleRelevance("Software Engineer", ["Product Manager"])).toBe(0);
  });
  it("keyword score is deterministic", () => {
    const s = scoreRole({ title: "Senior DevOps Engineer", description: "We use AWS, Kubernetes, Terraform and Python.", resumeText: "DevOps AWS Kubernetes Terraform Python", resumeSkills: [], targetRoles: ["DevOps Engineer"] });
    expect(s.skills).toBe(100);
    expect(s.score).toBeGreaterThanOrEqual(70);
    expect(scoreRole({ title: "Senior DevOps Engineer", description: "We use AWS, Kubernetes, Terraform and Python.", resumeText: "DevOps AWS Kubernetes Terraform Python", resumeSkills: [], targetRoles: ["DevOps Engineer"] })).toEqual(s);
  });
  it("dedup key ignores query strings and is stable", () => {
    expect(dedupKey({ ats: "greenhouse", board: "Stripe", externalId: "1", url: "https://x/1?gh_src=a" })).toBe(dedupKey({ ats: "greenhouse", board: "stripe", externalId: "1", url: "https://x/1" }));
  });
  it("flags inputs the user must provide", () => {
    expect(needsInputFor(["Street address", "Desired salary", "Create a password"], false)).toEqual(expect.arrayContaining(["Street address", "Salary expectation (not in saved answers)", "Create a password on the employer site"]));
    expect(needsInputFor(["Desired salary"], true)).toEqual([]);
  });
});

const src: ResumeContent = {
  ...emptyResume(),
  name: "Asha Rao", summary: "Platform lead with 8 years in cloud.",
  skills: [{ group: "Core", items: ["Python", "AWS", "Kubernetes", "Terraform"] }],
  experience: [{ company: "Acme", title: "SRE Lead", location: "Pune", start: "2019", end: "2024", bullets: ["Cut AWS cost 30%", "Led Kubernetes migration for 40 services", "Mentored 5 engineers"] }],
  certifications: ["CKA"],
};

describe("tailoring guardrail", () => {
  it("tailoring only reorders and passes validation", () => {
    const t = tailorResume(src, "Kubernetes and Terraform expert", ["kubernetes", "terraform"]);
    expect(t.skills[0].items[0]).toBe("Kubernetes");
    expect(t.experience[0].bullets[0]).toContain("Kubernetes");
    expect(validateTailored(src, t)).toEqual({ ok: true, violations: [] });
  });
  it("rejects invented employer, title, dates, metric, skill, certification", () => {
    const bad: ResumeContent = JSON.parse(JSON.stringify(src));
    bad.experience[0].company = "Google";
    bad.experience[0].title = "VP Engineering";
    bad.experience[0].end = "2025";
    bad.experience[0].bullets.push("Saved $2M annually");
    bad.skills[0].items.push("Rust");
    bad.certifications.push("AWS SA Pro");
    const fields = validateTailored(src, bad).violations.map((v) => v.field);
    for (const f of ["employer", "title", "dates", "metric", "skill", "certification"]) expect(fields).toContain(f);
  });
});

describe("answers and catalog", () => {
  it("discloses sponsorship truthfully", () => {
    const base = { name: "A", email: "a@x.in", phone: "", location: "Pune", links: [], noticePeriodDays: 30, currentCtcLakhs: null, expectedCtcLakhs: null, homeCountry: "India", saved: [] };
    const abroad = buildAnswers({ ...base, needsSponsorship: true, jobCountry: "Germany" }).find((a) => a.source === "sponsorship");
    expect(abroad?.answer).toMatch(/^Yes/);
    const home = buildAnswers({ ...base, needsSponsorship: true, jobCountry: "India" }).find((a) => a.source === "sponsorship");
    expect(home?.answer).toMatch(/^No/);
    expect(hasSalaryAnswer({ expectedCtcLakhs: null, saved: [] })).toBe(false);
  });
  it("catalog has only verified ATS entries, no duplicates", () => {
    expect(VERIFIED_COMPANIES.length).toBeGreaterThanOrEqual(80);
    const keys = VERIFIED_COMPANIES.map((c) => `${c.ats}:${c.token}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const c of VERIFIED_COMPANIES) expect(["greenhouse", "lever", "ashby", "smartrecruiters"]).toContain(c.ats);
  });
  it("parses CSV and suggests unlisted companies", () => {
    const r = parseCompanyCsv("name,ats,board_token,industry\nStripe,greenhouse,stripe,Fintech\nBad,workday,x");
    expect(r.rows).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
    expect(suggestCompanies([{ ats: "greenhouse", boardToken: "stripe" }], ["fintech"]).some((c) => c.token === "stripe")).toBe(false);
  });
});
