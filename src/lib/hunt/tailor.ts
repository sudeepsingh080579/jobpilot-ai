/**
 * Tailored resume per role: reorder only. Skills, roles' bullets and certifications are
 * re-ordered by relevance to the job; no text is invented. `validateTailored` is the
 * guardrail that rejects any employer, title, date, metric, skill or certification
 * not present in the source resume.
 */
import type { ResumeContent } from "@/lib/resume/types";

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const hits = (text: string, jd: string, terms: string[]) => terms.filter((t) => jd.includes(t) && text.toLowerCase().includes(t)).length;

export function tailorResume(source: ResumeContent, jobText: string, keywords: string[]): ResumeContent {
  const jd = jobText.toLowerCase();
  const kw = keywords.map((k) => k.toLowerCase());
  const byHits = <T>(items: T[], text: (x: T) => string) =>
    items.map((x, i) => ({ x, i, h: hits(text(x), jd, kw) + (jd.includes(norm(text(x))) ? 2 : 0) })).sort((a, b) => b.h - a.h || a.i - b.i).map((r) => r.x);
  return {
    ...source,
    skills: source.skills.map((g) => ({ ...g, items: byHits(g.items, (s) => s) })),
    experience: source.experience.map((r) => ({ ...r, bullets: byHits(r.bullets, (b) => b) })),
    certifications: byHits(source.certifications, (c) => c),
  };
}

const NUM = /\d[\d,.]*\s*(%|\+|x|k|m|cr|lakh|lakhs|crore|years?|yrs?)?/gi;

function numbers(text: string) {
  return [...text.matchAll(NUM)].map((m) => m[0].replace(/\s+/g, "").toLowerCase());
}

export type Violation = { field: string; value: string };

export function validateTailored(source: ResumeContent, tailored: ResumeContent): { ok: boolean; violations: Violation[] } {
  const v: Violation[] = [];
  const srcText = JSON.stringify(source).toLowerCase();
  const srcRoles = new Set(source.experience.map((r) => `${norm(r.company)}|${norm(r.title)}|${norm(r.start)}|${norm(r.end)}`));
  const srcCompanies = new Set(source.experience.map((r) => norm(r.company)));
  const srcTitles = new Set(source.experience.map((r) => norm(r.title)));
  for (const r of tailored.experience) {
    if (!srcCompanies.has(norm(r.company))) v.push({ field: "employer", value: r.company });
    if (!srcTitles.has(norm(r.title))) v.push({ field: "title", value: r.title });
    if (!srcRoles.has(`${norm(r.company)}|${norm(r.title)}|${norm(r.start)}|${norm(r.end)}`)) v.push({ field: "dates", value: `${r.company} ${r.start}–${r.end}` });
  }
  const srcSkills = new Set(source.skills.flatMap((g) => g.items).map(norm));
  for (const s of tailored.skills.flatMap((g) => g.items)) if (!srcSkills.has(norm(s))) v.push({ field: "skill", value: s });
  const srcCerts = new Set(source.certifications.map(norm));
  for (const c of tailored.certifications) if (!srcCerts.has(norm(c))) v.push({ field: "certification", value: c });
  const srcNums = new Set(numbers(srcText));
  const textFields = [tailored.summary, tailored.headline, ...tailored.experience.flatMap((r) => r.bullets)];
  for (const t of textFields) for (const n of numbers(t)) if (!srcNums.has(n)) v.push({ field: "metric", value: n });
  for (const e of tailored.education) if (!srcText.includes(norm(e.school)) || (e.year && !srcText.includes(norm(e.year)))) v.push({ field: "education", value: `${e.school} ${e.year}` });
  return { ok: v.length === 0, violations: v };
}
