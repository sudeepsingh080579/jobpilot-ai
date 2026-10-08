import { emptyResume, type ResumeContent } from "@/lib/resume/types";

const SECTION =
  /^(summary|profile|about|experience|work experience|employment|skills|education|certifications|certification)\s*:?\s*$/i;

export function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseResumeText(text: string): ResumeContent {
  const content = emptyResume();
  const cleaned = text.replace(/\r/g, "").trim();
  const email = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = cleaned.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}/);
  if (email) content.email = email[0];
  if (phone) content.phone = phone[0].trim();

  const lines = cleaned
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const first = lines.find((line) => !line.includes("@") && line.length < 60 && !/^https?:/i.test(line));
  content.name = first ?? "";

  let section = "preamble";
  const buckets: Record<string, string[]> = { preamble: [], summary: [], experience: [], skills: [], education: [], certifications: [] };

  for (const line of lines) {
    if (SECTION.test(line)) {
      const key = line.toLowerCase().replace(":", "").trim();
      if (key.startsWith("sum") || key === "profile" || key === "about") section = "summary";
      else if (key.startsWith("exp") || key.startsWith("work") || key.startsWith("employ")) section = "experience";
      else if (key.startsWith("skill")) section = "skills";
      else if (key.startsWith("edu")) section = "education";
      else section = "certifications";
      continue;
    }
    (buckets[section] ?? buckets.preamble).push(line);
  }

  content.summary = (buckets.summary.length ? buckets.summary : buckets.preamble.slice(1, 4)).join(" ").slice(0, 900);
  const skillLine = buckets.skills.join(", ");
  const skillItems = skillLine
    .split(/[,|•·]/)
    .map((item) => item.replace(/^[-*]\s*/, "").trim())
    .filter((item) => item.length > 1 && item.length < 40);
  if (skillItems.length) content.skills = [{ group: "Skills", items: skillItems.slice(0, 24) }];

  const expLines = buckets.experience.length ? buckets.experience : [];
  let current: ResumeContent["experience"][number] | null = null;
  const roles: ResumeContent["experience"] = [];
  for (const line of expLines) {
    const bullet = line.replace(/^[-*•]\s*/, "");
    const isBullet = /^[-*•]/.test(line) || (current && line.length > 40);
    if (!isBullet) {
      if (current) roles.push(current);
      const [title, rest] = bullet.split(/\s+[—–-]\s+|\s+at\s+/i);
      current = {
        company: (rest ?? "Company").trim(),
        title: (title ?? bullet).trim(),
        location: "",
        start: "",
        end: "",
        bullets: [],
      };
    } else if (current) {
      current.bullets.push(bullet);
    }
  }
  if (current) roles.push(current);
  content.experience = roles.slice(0, 8);

  content.education = buckets.education.slice(0, 4).map((line) => ({
    school: line,
    credential: line,
    year: (line.match(/20\d{2}|19\d{2}/) ?? [""])[0],
  }));
  content.certifications = buckets.certifications.slice(0, 8);
  if (!content.headline) content.headline = content.experience[0]?.title ?? "";
  return content;
}
