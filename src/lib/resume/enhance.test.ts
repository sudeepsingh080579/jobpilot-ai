import { describe, expect, it } from "vitest";
import { atsScore } from "@/lib/resume/ats-score";
import { enhanceResume, renderAtsText } from "@/lib/resume/enhance";
import { parseResumeText } from "@/lib/resume/parse";
import { familyById, suggestFamilies } from "@/lib/resume/roles";
import { rewordBullet, splitLongBullet } from "@/lib/resume/verbs";
import { validateTailored } from "@/lib/hunt/tailor";

/** Synthetic, clearly fictional test resume. */
import { SAMPLE } from "@/lib/resume/sample";

describe("resume parser", () => {
  it("parses headings, roles, dates, bullets, skills, education", () => {
    const c = parseResumeText(SAMPLE);
    expect(c.email).toBe("anita.rao.test@example.com");
    expect(c.experience).toHaveLength(2);
    expect(c.experience[0]).toMatchObject({ title: "Senior SRE", company: "Northwind Cloud", start: "Jan 2021", end: "Present" });
    expect(c.experience[0].bullets).toHaveLength(4);
    expect(c.experience[1]).toMatchObject({ company: "Contoso Payments", start: "Jun 2017", end: "Dec 2020" });
    expect(c.skills.flatMap((g) => g.items)).toContain("Terraform");
    expect(c.education[0]).toMatchObject({ school: "VIT University", year: "2016" });
    expect(c.certifications).toEqual(["AWS Certified Solutions Architect – Associate"]);
    expect(c.summary).toMatch(/Kubernetes platforms/);
  });
  it("round-trips the ATS layout it generates", () => {
    const first = parseResumeText(SAMPLE);
    const again = parseResumeText(renderAtsText(first));
    expect(again.experience.map((r) => [r.title, r.company, r.start, r.end, r.bullets.length])).toEqual(first.experience.map((r) => [r.title, r.company, r.start, r.end, r.bullets.length]));
    expect(again.skills.flatMap((g) => g.items)).toEqual(first.skills.flatMap((g) => g.items));
    expect(again.email).toBe(first.email);
  });
  it("handles a title line without title words when a date line follows", () => {
    const c = parseResumeText("Jo Test\nEXPERIENCE\nChief Wizard | Hogwarts\nJan 2020 - Present\n- Taught spells\nGrand Poobah | Acme\nJan 2018 - Dec 2019\n- Ran things");
    expect(c.experience).toHaveLength(2);
    expect(c.experience[1].start).toBe("Jan 2018");
  });
});

describe("bullet rewording", () => {
  it("swaps weak openers and gerunds for past-tense verbs without touching facts", () => {
    expect(rewordBullet("Responsible for managing Kubernetes clusters across 3 regions").text).toBe("Managed Kubernetes clusters across 3 regions");
    expect(rewordBullet("Worked on the migration to Terraform").text).toBe("Contributed to the migration to Terraform");
    expect(rewordBullet("Leading a team of 5").text).toBe("Led a team of 5");
    expect(rewordBullet("I have mentored 4 engineers").text).toBe("Mentored 4 engineers");
    expect(rewordBullet("Reduced cost by 22%.").text).toBe("Reduced cost by 22%");
  });
  it("splits long bullets only at semicolons", () => {
    const long = `${"a".repeat(150)}; ${"b".repeat(150)}`;
    expect(splitLongBullet(long)).toHaveLength(2);
    expect(splitLongBullet("x".repeat(300))).toHaveLength(1);
  });
});

describe("enhanceResume", () => {
  const r = enhanceResume({ rawText: SAMPLE, familyId: "devops-sre" });
  it("never adds facts: guardrail finds no novel words and validateTailored passes", () => {
    expect(r.novel).toEqual([]);
    const noExtra = { ...r.enhanced, skills: r.enhanced.skills.filter((g) => g.group !== "Also used in experience") };
    expect(validateTailored(r.original, noExtra).violations.filter((v) => v.field !== "metric")).toEqual([]);
    const origNums = new Set((SAMPLE.match(/\d+/g) ?? []));
    for (const n of renderAtsText(r.enhanced).match(/\d+/g) ?? []) expect(origNums.has(n)).toBe(true);
  });
  it("keeps employers, titles, dates", () => {
    expect(r.enhanced.experience.map((x) => [x.company, x.title, x.start, x.end])).toEqual(r.original.experience.map((x) => [x.company, x.title, x.start, x.end]));
  });
  it("rewrites bullets and removes the duplicate", () => {
    const b = r.enhanced.experience[0].bullets;
    expect(b[0]).toBe("Managed Kubernetes clusters across 3 regions");
    expect(b[2]).toBe("Worked with product teams to move services to Terraform");
    expect(b[3]).toBe("Mentored 4 junior engineers on on-call practices");
    const c2 = r.enhanced.experience[1].bullets;
    expect(c2.filter((x) => x.startsWith("Cut cloud spend 22%")).length).toBeLessThanOrEqual(2);
    expect(c2.every((x) => x.length <= 270)).toBe(true);
  });
  it("scores higher after than before, with reasons", () => {
    expect(r.after.score).toBeGreaterThan(r.before.score);
    expect(r.after.checks.find((c) => c.id === "h-exp")?.points).toBe(4);
    expect(r.before.checks.find((c) => c.id === "h-exp")?.points).toBe(4); // "WORK EXPERIENCE" is already standard
    expect(r.before.checks.find((c) => c.id === "glyphs")!.points).toBeLessThan(3); // ➢ bullets
    expect(r.after.checks.find((c) => c.id === "glyphs")?.points).toBe(3);
    expect(r.coverage).toBeGreaterThan(0.85);
  });
  it("does not invent skills or certifications", () => {
    const src = new Set(r.original.skills.flatMap((g) => g.items).map((s) => s.toLowerCase()));
    const add = r.enhanced.skills.find((g) => g.group === "Also used in experience");
    for (const s of add?.items ?? []) expect(SAMPLE.toLowerCase()).toContain(s.toLowerCase());
    for (const s of r.enhanced.skills.filter((g) => g.group !== "Also used in experience").flatMap((g) => g.items)) expect(src.has(s.toLowerCase())).toBe(true);
    expect(r.enhanced.certifications).toEqual(r.original.certifications);
  });
  it("suggests metrics and keywords but does not apply them", () => {
    expect(r.suggestions.some((s) => s.kind === "keyword")).toBe(true);
  });
  it("is deterministic", () => {
    expect(enhanceResume({ rawText: SAMPLE, familyId: "devops-sre" })).toEqual(r);
  });
});

describe("ats score + roles", () => {
  it("penalises multi-column text and symbols", () => {
    const messy = "JO\njo@x.com\nSkills        Experience\nPython        Dev ✔ ☎\nGo            Ops";
    const c = parseResumeText(messy);
    const s = atsScore({ text: messy, content: c, family: familyById("backend")! });
    expect(s.checks.find((x) => x.id === "columns")!.points).toBeLessThan(6);
    expect(s.score).toBeLessThan(40);
  });
  it("suggests the SRE family for the sample", () => {
    const c = parseResumeText(SAMPLE);
    const s = suggestFamilies({ titles: c.experience.map((r) => r.title), headline: c.headline, text: SAMPLE });
    expect(s[0].family.id).toBe("devops-sre");
  });
});

import { exportFileName, renderDocx, renderPdf } from "@/lib/resume/export";
import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";
import JSZip from "jszip";

describe("exports", () => {
  const r = enhanceResume({ rawText: SAMPLE, familyId: "devops-sre" });
  it("PDF is real selectable text, in reading order, with no images", async () => {
    const bytes = await renderPdf({ ...r.enhanced, name: "Zoë Müller 日本" });
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: true });
    expect(text).toMatch(/Zo/);
    expect(text).toContain("EXPERIENCE");
    expect(text.indexOf("SUMMARY")).toBeLessThan(text.indexOf("SKILLS"));
    expect(text.indexOf("SKILLS")).toBeLessThan(text.indexOf("EXPERIENCE"));
    expect(text).toContain("Managed Kubernetes clusters across 3 regions");
    expect(Buffer.from(bytes).toString("latin1")).not.toMatch(/\/Subtype\s*\/Image/);
    const reparsed = parseResumeText(text);
    expect(reparsed.experience).toHaveLength(2);
    expect(reparsed.email).toBe("anita.rao.test@example.com");
  });
  it("PDF wraps long text over several pages", async () => {
    const big = { ...r.enhanced, experience: Array.from({ length: 12 }, () => ({ ...r.enhanced.experience[0], bullets: Array(8).fill("Built " + "pipeline ".repeat(30)) })) };
    const pdf = await getDocumentProxy(new Uint8Array(await renderPdf(big)));
    expect(pdf.numPages).toBeGreaterThan(1);
  });
  it("DOCX has headings and bullets but no tables, drawings or text boxes", async () => {
    const buf = await renderDocx(r.enhanced);
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).not.toMatch(/<w:tbl>|<w:drawing|<w:pict|<w:txbxContent|<w:cols /);
    expect(xml).toContain("Heading1");
    expect(xml).toContain("<w:numPr>");
    const { value } = await mammoth.extractRawText({ buffer: buf });
    expect(value).toContain("Senior SRE | Northwind Cloud | Bengaluru");
    expect(parseResumeText(value).experience).toHaveLength(2);
  });
  it("names files predictably", () => {
    expect(exportFileName("Anita Rao", 2, "pdf")).toBe("Anita_Rao_Resume_ATS_v2.pdf");
  });
});
