/**
 * Rule-based resume enhancement with a strict guardrail.
 *
 * Allowed: clean single-column structure, standard headings, consistent dates,
 * stronger opening verbs, splitting long bullets, de-duplication, surfacing skills
 * that are already mentioned in the experience text, re-ordering skills toward the
 * target role.
 * Never allowed: new employers, titles, dates, numbers, skills, certifications.
 * Every rewritten bullet is checked word-by-word against the original bullet and
 * reverted when it contains anything new. No language model is involved.
 */
import { atsScore, type AtsScore } from "@/lib/resume/ats-score";
import { parseResumeText } from "@/lib/resume/parse";
import { FALLBACK_FAMILY, ROLE_FAMILIES, hasWord, keywordHits, type RoleFamily } from "@/lib/resume/roles";
import { resumeToText, type ResumeContent } from "@/lib/resume/types";
import { REWORD_WORDS, rewordBullet, splitLongBullet } from "@/lib/resume/verbs";

export type Change = { section: string; kind: string; before: string; after: string };
export type Suggestion = { kind: "metric" | "keyword" | "section" | "date" | "parse"; text: string };
export type EnhanceResult = {
  original: ResumeContent;
  enhanced: ResumeContent;
  family: RoleFamily;
  before: AtsScore;
  after: AtsScore;
  changes: Change[];
  suggestions: Suggestion[];
  /** Share of original words still present in the enhanced resume (0–1). */
  coverage: number;
  /** Words in the enhanced text that are not in the original and not on the reword allow-list. Always [] when the guardrail holds. */
  novel: string[];
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec", "present"];
const HEADING_WORDS = ["summary", "skills", "experience", "education", "certifications", "projects", "additional"];
const GLUE = ["with", "experience", "in", "and", "skills", "including", "also", "used", "mentioned", "tools"];
const wordsOf = (s: string) => (s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9][a-z0-9+#./'-]*/g) ?? []).map((w) => w.replace(/[.'/-]+$/g, ""));
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

const titleCaseName = (n: string) => (n && n === n.toUpperCase() && /[A-Z]/.test(n) ? n.toLowerCase().replace(/(^|[\s'(-])([a-z])/g, (_, a, b) => a + b.toUpperCase()) : n);

/** Render the standard single-column layout as plain text (also what the PDF/DOCX contain). */
export function renderAtsText(c: ResumeContent): string {
  const out: string[] = [];
  out.push(c.name);
  if (c.headline) out.push(c.headline);
  const contact = [c.location, c.email, c.phone, ...c.links].filter(Boolean).join(" | ");
  if (contact) out.push(contact);
  if (c.summary) out.push("", "SUMMARY", c.summary);
  if (c.skills.length) out.push("", "SKILLS", ...c.skills.map((g) => (g.group && g.group !== "Skills" ? `${g.group}: ${g.items.join(", ")}` : g.items.join(", "))));
  if (c.experience.length) {
    out.push("", "EXPERIENCE");
    for (const r of c.experience) {
      out.push([r.title, r.company, r.location].filter(Boolean).join(" | "));
      const dates = [r.start, r.end].filter(Boolean).join(" – ");
      if (dates) out.push(dates);
      for (const b of r.bullets) out.push(`• ${b}`);
    }
  }
  if (c.projects?.length) {
    out.push("", "PROJECTS");
    for (const p of c.projects) { if (p.name && p.name !== "Projects") out.push(p.name); for (const b of p.bullets) out.push(`• ${b}`); }
  }
  if (c.education.length) out.push("", "EDUCATION", ...c.education.map((e) => [e.credential, e.school, e.year].filter(Boolean).join(" | ")));
  if (c.certifications.length) out.push("", "CERTIFICATIONS", ...c.certifications.map((x) => `• ${x}`));
  for (const a of c.additional ?? []) out.push("", a.heading.toUpperCase(), ...a.lines.map((l) => `• ${l}`));
  return out.join("\n");
}

function novelWords(candidate: string, allowedSources: string[], extra: Iterable<string> = []): string[] {
  const allowed = new Set<string>([...extra]);
  for (const s of allowedSources) for (const w of wordsOf(s)) allowed.add(w);
  return [...new Set(wordsOf(candidate).filter((w) => !allowed.has(w)))];
}

function enhanceBullet(b: string, current: boolean, changes: Change[], section: string): string[] {
  const rw = rewordBullet(b, { current });
  let text = rw.text;
  // Guardrail: the reworded bullet may only contain original words plus verb forms from the table.
  if (novelWords(text, [b], REWORD_WORDS).length) text = clean(b).replace(/^[•·▪●◦■►➢➤✓*+-]\s*/, "").replace(/\.+$/, "");
  text = text ? text[0].toUpperCase() + text.slice(1) : text;
  const parts = splitLongBullet(text);
  if (clean(b) !== parts.join(" ")) {
    changes.push({ section, kind: parts.length > 1 ? "split long bullet" : rw.rule ?? "cleaned", before: clean(b), after: parts.join("  ›  ") });
  }
  return parts;
}

function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((i) => { const k = i.toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; });
}

function mentionedTools(content: ResumeContent, family: RoleFamily): string[] {
  const body = [...content.experience.flatMap((r) => r.bullets), ...(content.projects ?? []).flatMap((p) => p.bullets), content.summary].join("\n");
  const listed = content.skills.flatMap((g) => g.items).join(" , ");
  const out: string[] = [];
  for (const [kw, aliases] of Object.entries(family.keywords)) {
    if (kw.length < 2) continue;
    const inBody = aliases.find((a) => hasWord(body, a));
    if (!inBody || aliases.some((a) => hasWord(listed, a))) continue;
    // Use the spelling that actually appears in the resume.
    const m = body.match(new RegExp(`(?<![A-Za-z0-9])${inBody.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`, "i"));
    if (m && /^[A-Za-z0-9.+#/ -]{2,30}$/.test(m[0]) && m[0].split(" ").length <= 3 && !/^(security|monitoring|incident|on[- ]call|slo|sla|observability|api|apis|networking|reporting|delivery|launch|metrics|strategy|budget|leadership|architecture|migration|cloud migration|compliance|requirements|schedule|timeline|risk|risk management|roadmap|performance|accessibility|campaign|campaigns|outreach|analytics|revenue|pipeline|targets|launch|hiring|mentoring|mentored)$/i.test(m[0])) out.push(m[0]);
  }
  return dedupe(out).slice(0, 10);
}

export function enhanceResume(input: { rawText: string; original?: ResumeContent; familyId?: string }): EnhanceResult {
  const original = input.original ?? parseResumeText(input.rawText);
  const rawText = input.rawText || resumeToText(original);
  const family = ROLE_FAMILIES.find((f) => f.id === input.familyId) ?? bestFamily(original, rawText);
  const changes: Change[] = [];
  const suggestions: Suggestion[] = [];

  const e: ResumeContent = JSON.parse(JSON.stringify(original));
  const name = titleCaseName(original.name);
  if (name !== original.name) { e.name = name; changes.push({ section: "Header", kind: "capitalisation", before: original.name, after: name }); }

  // Headline: keep what is there; otherwise reuse the most recent job title (already in the resume).
  if (!e.headline && e.experience[0]?.title) { e.headline = e.experience[0].title; changes.push({ section: "Header", kind: "headline from latest title", before: "", after: e.headline }); }

  e.summary = clean(e.summary);
  // Experience bullets.
  e.experience = e.experience.map((r) => {
    const current = /present|current/i.test(r.end);
    const bullets = dedupe(r.bullets.flatMap((b) => enhanceBullet(b, current, changes, `Experience · ${r.title || r.company}`)));
    return { ...r, title: clean(r.title), company: clean(r.company), location: clean(r.location), bullets };
  });
  if (e.projects) e.projects = e.projects.map((p) => ({ ...p, bullets: dedupe(p.bullets.flatMap((b) => enhanceBullet(b, true, changes, `Projects · ${p.name}`))) }));

  // Skills: de-duplicate, role keywords first, then surface tools the experience text already mentions.
  const roleAliases = Object.values(family.keywords).flat();
  const rank = (s: string) => (roleAliases.some((a) => hasWord(s, a)) ? 0 : 1);
  e.skills = e.skills.map((g) => ({ ...g, items: dedupe(g.items).map((s, i) => ({ s, i })).sort((a, b) => rank(a.s) - rank(b.s) || a.i - b.i).map((x) => x.s) }));
  const extra = mentionedTools(e, family);
  if (extra.length) {
    e.skills.push({ group: "Also used in experience", items: extra });
    changes.push({ section: "Skills", kind: "surfaced tools already named in your experience", before: "", after: extra.join(", ") });
  }
  if (!e.skills.length) suggestions.push({ kind: "section", text: "No Skills section was detected. Add a plain “Skills” list so ATS parsers can read your keywords." });

  e.certifications = dedupe(e.certifications.map(clean));

  // Summary: only generated from facts already present, and only when missing.
  if (!e.summary && e.experience[0]?.title) {
    const topSkills = e.skills.flatMap((g) => g.items).slice(0, 4);
    e.summary = `${e.experience[0].title}${e.experience[0].company ? ` at ${e.experience[0].company}` : ""}${topSkills.length ? ` with experience in ${topSkills.join(", ")}` : ""}.`;
    changes.push({ section: "Summary", kind: "generated from your latest title and listed skills", before: "", after: e.summary });
    suggestions.push({ kind: "section", text: "Your summary was generated only from your title and skills. Replace it with 2–3 sentences about your scope when you can." });
  }

  // Guardrail over the whole document.
  const structural = new Set<string>([...MONTHS, ...HEADING_WORDS, ...GLUE, ...REWORD_WORDS]);
  const sources = [rawText, resumeToText(original)];
  const enhancedText = renderAtsText(e);
  const novel = novelWords(enhancedText.replace(/[|•–]/g, " "), sources, structural);

  // Suggestions, never auto-applied.
  const flat = e.experience.flatMap((r) => r.bullets.map((b) => ({ b, r })));
  const unnumbered = flat.filter((x) => !/\d/.test(x.b));
  if (unnumbered.length > flat.length * 0.5 && flat.length) suggestions.push({ kind: "metric", text: `${unnumbered.length} of ${flat.length} bullets have no number. If you know the real figure (team size, % improvement, volume, cost), add it. We do not invent numbers.` });
  for (const x of unnumbered.slice(0, 4)) suggestions.push({ kind: "metric", text: `Add a real metric if you have one: “${x.b.slice(0, 110)}${x.b.length > 110 ? "…" : ""}”` });
  const { absent } = keywordHits(family, enhancedText);
  if (absent.length) suggestions.push({ kind: "keyword", text: `Keywords common for ${family.label} that are not in your resume: ${absent.slice(0, 10).join(", ")}. Add one only if you genuinely have that experience.` });
  for (const r of e.experience) if (!r.start || !r.end) suggestions.push({ kind: "date", text: `Add start and end dates for “${r.title || r.company}”.` });
  if (!e.experience.length) suggestions.push({ kind: "parse", text: "We could not detect separate roles in your experience section. Check the side-by-side view and make sure each job has a title, company and dates." });
  else if (!flat.length) suggestions.push({ kind: "parse", text: "No bullets were detected under your roles. Use one line per achievement, starting with a verb." });
  if (!e.links.length) suggestions.push({ kind: "section", text: "Add your LinkedIn URL (and GitHub if relevant) to the header." });

  const origWords = new Set(wordsOf(rawText));
  const enhWords = new Set(wordsOf(enhancedText));
  const kept = [...origWords].filter((w) => enhWords.has(w) || /^\d{1,2}$/.test(w) || w.length < 2).length;
  const coverage = origWords.size ? kept / origWords.size : 1;
  if (coverage < 0.85) suggestions.unshift({ kind: "parse", text: `Only ${Math.round(coverage * 100)}% of the words in your upload were carried into the structured version (some layouts do not extract cleanly). Review the side-by-side view before downloading.` });

  const before = atsScore({ text: rawText, content: original, family });
  const after = atsScore({ text: enhancedText, content: e, family });
  return { original, enhanced: e, family, before, after, changes, suggestions, coverage, novel };
}

export function bestFamily(content: ResumeContent, text: string): RoleFamily {
  const titles = content.experience.map((r) => r.title);
  const scored = ROLE_FAMILIES.map((f) => {
    const t = [...titles.slice(0, 2), content.headline].join(" | ");
    const th = f.titleWords.filter((w) => hasWord(t, w)).length;
    const { present, total } = keywordHits(f, text);
    return { f, s: th * 3 + (total ? present.length / total : 0) * 6 };
  }).sort((a, b) => b.s - a.s);
  return scored[0] && scored[0].s > 0.5 ? scored[0].f : FALLBACK_FAMILY;
}
