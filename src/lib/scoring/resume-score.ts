import type { ResumeContent } from "@/lib/resume/types";

const VERBS = ["led", "built", "cut", "reduced", "shipped", "launched", "owned", "designed", "migrated", "scaled", "hired", "established", "delivered", "improved", "automated", "introduced", "ran", "defined"];

export type ResumeCheck = { id: string; label: string; pass: boolean; hint: string };

export function scoreResume(content: ResumeContent) {
  const bullets = content.experience.flatMap((role) => role.bullets);
  const skillCount = content.skills.reduce((sum, group) => sum + group.items.length, 0);
  const quantified = bullets.filter((bullet) => /\d/.test(bullet)).length;
  const verbLed = bullets.filter((bullet) => VERBS.some((verb) => bullet.toLowerCase().startsWith(verb))).length;
  const longBullets = bullets.filter((bullet) => bullet.length > 240).length;

  const checks: ResumeCheck[] = [
    { id: "name", label: "Name is present", pass: content.name.trim().length > 1, hint: "Put the name on the first line." },
    { id: "email", label: "Email is present", pass: /@/.test(content.email), hint: "Add a professional email." },
    { id: "reach", label: "Location or phone", pass: Boolean(content.location.trim() || content.phone.trim()), hint: "Add a city or a phone number." },
    { id: "headline", label: "Headline states the target", pass: content.headline.trim().length > 8, hint: "Use a headline a hiring manager can repeat." },
    {
      id: "summary",
      label: "Summary is a tight paragraph",
      pass: content.summary.trim().length >= 80 && content.summary.trim().length <= 700,
      hint: "Aim for 80–700 characters. Lead with scope, not 'I am'.",
    },
    { id: "roles", label: "At least two roles", pass: content.experience.length >= 2, hint: "Show the last two scopes, even if one was internal." },
    { id: "bullets", label: "At least six bullets", pass: bullets.length >= 6, hint: "Six bullets is enough to show range without a memoir." },
    {
      id: "numbers",
      label: "Most bullets carry a number",
      pass: bullets.length > 0 && quantified / bullets.length >= 0.4,
      hint: "Add cost, latency, headcount, or adoption to at least 40% of bullets.",
    },
    { id: "skills", label: "Skills are specific", pass: skillCount >= 8, hint: "List tools and practices a search would filter on." },
    {
      id: "verbs",
      label: "Bullets open with an action",
      pass: bullets.length > 0 && verbLed / bullets.length >= 0.5,
      hint: "Start with led, cut, shipped, migrated, or owned.",
    },
    {
      id: "length",
      label: "Bullets stay skimmable",
      pass: bullets.length === 0 || longBullets / bullets.length < 0.5,
      hint: "Keep a bullet under about 240 characters.",
    },
    { id: "education", label: "Education or equivalent", pass: content.education.length > 0 || content.certifications.length > 0, hint: "Add a degree or a certification." },
  ];

  const passed = checks.filter((check) => check.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  const band = score >= 75 ? "green" : score >= 50 ? "yellow" : "red";
  return { score, band, checks, passed, total: checks.length };
}
