import { headingOf } from "@/lib/resume/parse";
import { keywordHits, type RoleFamily } from "@/lib/resume/roles";
import type { ResumeContent } from "@/lib/resume/types";
import { ACTION_VERBS } from "@/lib/resume/verbs";

export type AtsCheck = { id: string; group: "Structure" | "Layout" | "Content" | "Keywords"; label: string; points: number; max: number; detail: string };
export type AtsScore = { score: number; checks: AtsCheck[]; groups: Record<string, { points: number; max: number }>; keywordsPresent: string[]; keywordsAbsent: string[] };

const FIRST_PERSON = /^(i|i'm|i've|my)\b/i;
const WEAK = /^(responsible for|duties|worked on|helped|involved in|tasked with|in charge of)/i;
const ODD_GLYPH = /[\u2700-\u27bf\uf000-\uf8ff\u{1F300}-\u{1FAFF}\u2190-\u21ff\u25a0-\u25ff\u2600-\u26ff]/gu;
const STANDARD_BULLET = /^\s*[•\-*·]\s/;

/**
 * ATS-compliance score, 0–100. The same function scores the original (its raw text and
 * parsed content) and the enhanced version (rendered text and content), so the before/after
 * numbers are directly comparable. Rule-based and deterministic.
 */
export function atsScore(input: { text: string; content: ResumeContent; family: RoleFamily }): AtsScore {
  const { text, content, family } = input;
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.trim());
  const checks: AtsCheck[] = [];
  const add = (id: string, group: AtsCheck["group"], label: string, ok: number, max: number, detail: string) =>
    checks.push({ id, group, label, points: Math.round(Math.max(0, Math.min(1, ok)) * max * 10) / 10, max, detail });

  // Structure (25)
  const heads = new Set(lines.map((l) => headingOf(l.trim())?.key).filter(Boolean));
  add("name", "Structure", "Name is the first line", content.name.trim().length > 1 && lines[0]?.toLowerCase().includes(content.name.toLowerCase().split(" ")[0]) ? 1 : content.name ? 0.5 : 0, 3, "The first line should be your name.");
  add("email", "Structure", "Email address", /@/.test(content.email) ? 1 : 0, 4, "Parsers read the email to create your profile.");
  add("phone", "Structure", "Phone number", content.phone.replace(/\D/g, "").length >= 9 ? 1 : 0, 3, "Include a phone number with country code.");
  add("location", "Structure", "City / location", content.location.trim() ? 1 : 0, 2, "Recruiters filter by location.");
  add("h-exp", "Structure", "Standard heading: Experience", heads.has("experience") ? 1 : 0, 4, "Use “Experience” or “Work Experience”.");
  add("h-skills", "Structure", "Standard heading: Skills", heads.has("skills") ? 1 : 0, 3, "Use “Skills” so keywords are read as skills.");
  add("h-edu", "Structure", "Standard heading: Education", heads.has("education") ? 1 : content.education.length ? 0.3 : 0, 3, "Use “Education”.");
  add("h-sum", "Structure", "Standard heading: Summary", heads.has("summary") ? 1 : 0, 3, "A short “Summary” section helps keyword matching.");

  // Layout (15)
  const colLike = lines.filter((l) => /\S\s{4,}\S|\t/.test(l)).length;
  const colRatio = lines.length ? colLike / lines.length : 0;
  add("columns", "Layout", "Single column (no side-by-side text)", colRatio < 0.05 ? 1 : colRatio < 0.15 ? 0.5 : 0, 6, colLike ? `${colLike} line(s) look like multi-column or tabular text.` : "Reads top to bottom.");
  const pipeRows = lines.filter((l) => (l.match(/\|/g) ?? []).length >= 3).length;
  add("tables", "Layout", "No tables or pipe-separated grids", pipeRows === 0 ? 1 : pipeRows < 3 ? 0.5 : 0, 3, pipeRows ? `${pipeRows} line(s) look like table rows.` : "No table-like rows.");
  const odd = (text.match(ODD_GLYPH) ?? []).length;
  const bulletLines = lines.filter((l) => /^\s*[^\w\s(]/.test(l) && l.trim().length > 8 && !headingOf(l.trim()));
  const nonStd = bulletLines.filter((l) => !STANDARD_BULLET.test(l + " ") && /^\s*[^\w\s(\-*•·"'“]/.test(l)).length;
  add("glyphs", "Layout", "Plain bullets, no icons or symbols", odd === 0 && nonStd === 0 ? 1 : odd + nonStd < 4 ? 0.5 : 0, 3, odd + nonStd ? `${odd + nonStd} decorative symbol(s) may not parse.` : "Standard bullets only.");
  const dated = content.experience.filter((r) => r.start && r.end);
  add("dates", "Layout", "Every role has start and end dates", content.experience.length ? dated.length / content.experience.length : 0, 3, `${dated.length}/${content.experience.length} roles have both dates.`);

  // Content (30)
  const bullets = [...content.experience.flatMap((r) => r.bullets), ...(content.projects ?? []).flatMap((p) => p.bullets)];
  const n = bullets.length;
  const first = (b: string) => b.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
  const verbLed = bullets.filter((b) => ACTION_VERBS.has(first(b))).length;
  add("verbs", "Content", "Bullets start with an action verb", n ? Math.min(1, verbLed / n / 0.8) : 0, 10, `${verbLed}/${n} bullets open with an action verb.`);
  const quant = bullets.filter((b) => /\d/.test(b)).length;
  add("numbers", "Content", "Bullets carry numbers", n ? Math.min(1, quant / n / 0.5) : 0, 10, `${quant}/${n} bullets include a number. Only add numbers you can back up.`);
  const okLen = bullets.filter((b) => b.length >= 30 && b.length <= 260).length;
  add("length", "Content", "Bullets are 30–260 characters", n ? okLen / n : 0, 4, `${okLen}/${n} bullets are a skimmable length.`);
  const weak = bullets.filter((b) => FIRST_PERSON.test(b.trim()) || WEAK.test(b.trim())).length;
  add("weak", "Content", "No first-person or “responsible for” openers", n ? 1 - weak / n : 0, 3, weak ? `${weak} bullet(s) open with a weak phrase.` : "No weak openers.");
  const sl = content.summary.trim().length;
  add("summary", "Content", "Summary is 80–700 characters", sl >= 80 && sl <= 700 ? 1 : sl >= 30 ? 0.5 : 0, 3, sl ? `Summary is ${sl} characters.` : "No summary found.");

  // Keywords (30)
  const { present, absent, total } = keywordHits(family, text);
  const target = Math.min(total, 12);
  add("keywords", "Keywords", `Keywords for ${family.label}`, target ? Math.min(1, present.length / target) : 0.5, 30, total ? `${present.length} of ${total} common keywords found.` : "No target role selected.");

  const groups: AtsScore["groups"] = {};
  for (const c of checks) {
    groups[c.group] ??= { points: 0, max: 0 };
    groups[c.group].points += c.points;
    groups[c.group].max += c.max;
  }
  const score = Math.round(checks.reduce((s, c) => s + c.points, 0));
  return { score, checks, groups, keywordsPresent: present, keywordsAbsent: absent };
}
