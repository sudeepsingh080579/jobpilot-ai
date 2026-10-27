import { emptyResume, type ResumeContent } from "@/lib/resume/types";

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

type SectionKey = "summary" | "experience" | "skills" | "education" | "certifications" | "projects" | "additional";

const HEADINGS: { key: SectionKey; label: string; re: RegExp }[] = [
  { key: "summary", label: "Summary", re: /^(professional |executive |career |profile )?(summary|profile|objective|about( me)?|overview)$/ },
  { key: "experience", label: "Experience", re: /^((professional|work|relevant|employment|career) )?(experience|history)( summary)?$|^employment( history)?$|^work history$|^career history$/ },
  { key: "skills", label: "Skills", re: /^((technical|key|core|professional|it) )?(skills?|competenc(y|ies)|expertise|technologies|tools)( (&|and) (tools|technologies|competenc(y|ies)))?$|^skills? (summary|set)$|^technical proficiency$/ },
  { key: "education", label: "Education", re: /^(education(al)?( (background|qualifications?|details))?|academic( background| qualifications?)?|qualifications?)$/ },
  { key: "certifications", label: "Certifications", re: /^(certifications?|certificates?|licen[sc]es?( (&|and) certifications?)?|certifications? (&|and) (licen[sc]es?|training)|courses|training|training (&|and) certifications?)$/ },
  { key: "projects", label: "Projects", re: /^((key|personal|academic|selected|notable) )?projects?$/ },
  { key: "additional", label: "Additional", re: /^(awards?( (&|and) (honou?rs|achievements?|recognition))?|achievements?|honou?rs|languages?|interests|hobbies|publications?|volunteer(ing)?( experience)?|references|extracurricular( activities)?|personal (details|information))$/ },
];

export function headingOf(line: string): { key: SectionKey; label: string } | null {
  const t = line.replace(/[:：]\s*$/, "").replace(/[_\-–—=*#|]{2,}/g, "").trim().toLowerCase();
  if (!t || t.length > 40 || /[.@]/.test(t) || /\d/.test(t)) return null;
  for (const h of HEADINGS) if (h.re.test(t)) return { key: h.key, label: h.key === "additional" ? line.replace(/[:：]\s*$/, "").trim().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\s+/g, " ") : h.label };
  return null;
}

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MONTH}\\.?,?\\s*'?\\d{2,4}|\\d{1,2}\\s*[/.-]\\s*\\d{4}|(?:19|20)\\d{2})`;
const PRESENT = "(?:present|current|till date|to date|now|ongoing|today)";
export const DATE_RANGE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|${PRESENT})`, "i");
const SINGLE_YEAR_RANGE = /\b((?:19|20)\d{2})\s*(?:-|–|—)\s*((?:19|20)?\d{2})\b/;

const BULLET = /^\s*[•·▪▫●○◦■□◆◇▸▹►➢➤✓✔*+\u2022\u25CF\u25AA\u2023\u2043-]\s*/;
const isBullet = (l: string) => BULLET.test(l) && !/^-{2,}$/.test(l.trim()) && !/^\*{2,}$/.test(l.trim());
const stripBullet = (l: string) => l.replace(BULLET, "").trim();

const TITLE_WORDS = /\b(engineer|developer|manager|lead|architect|analyst|consultant|director|specialist|administrator|officer|head|intern|scientist|designer|associate|executive|sre|devops|programmer|tester|qa|coordinator|supervisor|vp|president|principal|staff|trainee|assistant|owner|strategist|researcher|technician|advisor|partner|founder|cto|ceo|cfo|coo|recruiter|accountant|editor|writer|marketer|representative|agent|generalist)\b/i;
const LOCATION_HINT = /\b(india|bengaluru|bangalore|mumbai|pune|hyderabad|chennai|gurugram|gurgaon|noida|delhi|kolkata|ahmedabad|kochi|jaipur|chandigarh|remote|uae|dubai|london|berlin|amsterdam|singapore|usa|uk|germany|netherlands|new york|san francisco|toronto)\b/i;

function monthIndex(s: string) {
  return ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(s.slice(0, 3).toLowerCase());
}

/** Normalise "March 2021", "03/2021", "2021" to "Mar 2021" / "2021"; "Present" stays "Present". */
export function normDate(raw: string): string {
  const s = raw.trim().replace(/[,']/g, " ").replace(/\s+/g, " ");
  if (new RegExp(`^${PRESENT}$`, "i").test(s)) return "Present";
  const my = s.match(new RegExp(`^(${MONTH})\\.?\\s*(\\d{2,4})$`, "i"));
  if (my) {
    const y = my[2].length === 2 ? `20${my[2]}` : my[2];
    return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][monthIndex(my[1])]} ${y}`;
  }
  const num = s.match(/^(\d{1,2})\s*[/.-]\s*(\d{4})$/);
  if (num && +num[1] >= 1 && +num[1] <= 12) return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+num[1] - 1]} ${num[2]}`;
  return s;
}

function splitHeader(line: string): string[] {
  return line.split(/\s+[|•·]\s+|\s+[—–]\s+|\s+-\s+|\t+|\s{3,}/).map((p) => p.trim()).filter(Boolean);
}

function parseRoleHeader(lines: string[], range?: { start: string; end: string }) {
  const clean = lines.map((l) => l.replace(DATE_RANGE, "").replace(SINGLE_YEAR_RANGE, "").replace(/[()|,–—-]\s*$/g, "").replace(/^[()|,–—-]\s*/g, "").trim()).filter(Boolean);
  let title = "";
  let company = "";
  let location = "";
  const parts: string[] = [];
  for (const l of clean) {
    const at = l.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
    if (at && TITLE_WORDS.test(at[1])) {
      parts.push(at[1].trim(), at[2].trim());
    } else parts.push(...splitHeader(l));
  }
  const rest: string[] = [];
  const expanded: string[] = [];
  for (const p of parts) {
    const m = p.match(/^(.+?),\s*([A-Za-z .]+(?:,\s*[A-Za-z .]+)?)$/);
    if (m && !TITLE_WORDS.test(m[1]) && LOCATION_HINT.test(m[2])) expanded.push(m[1].trim(), m[2].trim());
    else expanded.push(p);
  }
  for (const p of expanded) {
    if (!title && TITLE_WORDS.test(p) && p.length < 90) title = p;
    else if (!location && LOCATION_HINT.test(p) && p.length < 60 && !TITLE_WORDS.test(p)) location = p;
    else rest.push(p);
  }
  if (!title && rest.length > 1) title = rest.shift() as string;
  company = rest[0] ?? "";
  if (!location && rest[1] && rest[1].length < 50) location = rest[1];
  if (!title) { title = company; company = ""; }
  return { company: company.replace(/^[,;:]\s*|\s*[,;:]$/g, ""), title: title.replace(/^[,;:]\s*|\s*[,;:]$/g, ""), location, start: range?.start ?? "", end: range?.end ?? "" };
}

function rangeIn(line: string): { start: string; end: string } | undefined {
  const m = line.match(DATE_RANGE);
  if (m) return { start: normDate(m[1]), end: normDate(m[2]) };
  const y = line.match(SINGLE_YEAR_RANGE);
  if (y) {
    const end = y[2].length === 2 ? `${y[1].slice(0, 2)}${y[2]}` : y[2];
    return { start: y[1], end };
  }
  return undefined;
}

function parseExperience(lines: string[]) {
  const roles: ResumeContent["experience"] = [];
  let header: string[] = [];
  let range: { start: string; end: string } | undefined;
  let current: ResumeContent["experience"][number] | null = null;
  let lastWasBullet = false;
  const flushHeader = () => {
    if (!header.length && !range) return;
    current = { ...parseRoleHeader(header, range), bullets: [] };
    roles.push(current);
    header = [];
    range = undefined;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const r = !isBullet(line) ? rangeIn(line) : undefined;
    const nextIsDate = !r && !isBullet(line) && line.length < 100 && !!lines[i + 1] && !isBullet(lines[i + 1].trim()) && !!rangeIn(lines[i + 1].trim());
    if (isBullet(line)) {
      if (header.length || range) flushHeader();
      if (!current) current = { company: "", title: "", location: "", start: "", end: "", bullets: [] }, roles.push(current);
      current.bullets.push(stripBullet(line));
      lastWasBullet = true;
      continue;
    }
    if (r) {
      // A dated line starts a new role (its own text, if any, is part of the header).
      if (header.length && range) flushHeader();
      else if (current && !header.length) { /* new role after bullets */ }
      range = r;
      const rest = line.replace(DATE_RANGE, "").replace(SINGLE_YEAR_RANGE, "").trim();
      if (rest.replace(/[|,()–—-]/g, "").trim()) header.push(line);
      lastWasBullet = false;
      continue;
    }
    // Plain text line.
    if (lastWasBullet && current && !header.length && (/^[a-z(]/.test(line) || (!/[.!?:]$/.test(current.bullets[current.bullets.length - 1] ?? "") && line.length > 25 && !TITLE_WORDS.test(line)))) {
      current.bullets[current.bullets.length - 1] += ` ${line}`;
      continue;
    }
    if (lastWasBullet || (!header.length && !range && !current)) { lastWasBullet = false; }
    if (current && !header.length && !range && !lastWasBullet && current.bullets.length === 0 && roles.length && !current.title) { header.push(line); continue; }
    if (current && current.bullets.length && !header.length) {
      // Possibly an un-bulleted description line vs next role's title; titles are short and title-like.
      if (line.length < 90 && (nextIsDate || TITLE_WORDS.test(line) || /\s+(at|@)\s+/i.test(line))) { header.push(line); lastWasBullet = false; continue; }
      current.bullets.push(line);
      continue;
    }
    header.push(line);
    lastWasBullet = false;
    if (header.length >= 3 && !range) {
      // Three header lines without a date: treat as a role anyway.
      flushHeader();
    }
  }
  if (header.length || range) flushHeader();
  // Roles that only collected a header and a range get closed; drop empty shells.
  return roles.filter((r) => r.title || r.company || r.bullets.length);
}

function parseEducation(lines: string[]) {
  const out: ResumeContent["education"] = [];
  let buf: string[] = [];
  const flush = () => {
    if (!buf.length) return;
    const text = buf.join(" | ");
    const year = (text.match(/(?:19|20)\d{2}(?!.*(?:19|20)\d{2})/) ?? [""])[0];
    const stripped = buf.map((b) => b.replace(DATE_RANGE, "").replace(SINGLE_YEAR_RANGE, "").replace(/\b(?:19|20)\d{2}\b/g, "").replace(/[()|,–—-]\s*$/g, "").trim()).filter(Boolean);
    const cred = stripped.find((b) => /(b\.?\s?tech|b\.?e\b|m\.?\s?tech|b\.?sc|m\.?sc|bca|mca|mba|b\.?com|m\.?com|bachelor|master|ph\.?d|diploma|degree|post graduate|pgdm|b\.?a\b|m\.?a\b|certificate|12th|10th|hsc|ssc)/i.test(b)) ?? stripped[0] ?? "";
    const school = stripped.find((b) => b !== cred && /(university|college|institute|school|iit|nit|iim|academy|vidyalaya)/i.test(b)) ?? stripped.find((b) => b !== cred) ?? (/(university|college|institute|school)/i.test(cred) ? cred : "");
    const cm = cred.match(/^(.+?),\s*(.*(?:university|college|institute|school|iit|nit|iim).*)$/i);
    if (cm && (!school || school === cred)) out.push({ school: cm[2].trim(), credential: cm[1].trim(), year });
    else out.push({ school: school || cred, credential: cred, year });
    buf = [];
  };
  for (const raw of lines) {
    const l = stripBullet(raw.trim());
    if (!l) continue;
    const startsNew = /^(b\.?\s?tech|b\.?e\b|m\.?\s?tech|b\.?sc|m\.?sc|bca|mca|mba|bachelor|master|ph\.?d|diploma|pgdm)/i.test(l) && buf.some((b) => /(university|college|institute|school)/i.test(b) || /(?:19|20)\d{2}/.test(b));
    if (startsNew) flush();
    buf.push(l);
    if (/(?:19|20)\d{2}\s*$/.test(l) || /(?:19|20)\d{2}\)\s*$/.test(l)) flush();
  }
  flush();
  return out.slice(0, 6);
}

function parseSkills(lines: string[]): ResumeContent["skills"] {
  const groups: ResumeContent["skills"] = [];
  const loose: string[] = [];
  for (const raw of lines) {
    const l = stripBullet(raw.trim());
    if (!l) continue;
    const m = l.match(/^([A-Za-z][A-Za-z &/+.-]{1,40}?)\s*[:–—]\s*(.+)$/);
    const split = (s: string) => s.split(/[,;|•·]|\s{2,}/).map((x) => x.replace(/^[-*]\s*/, "").trim()).filter((x) => x.length > 1 && x.length < 50);
    if (m) {
      const items = split(m[2]);
      if (items.length) groups.push({ group: m[1].trim(), items });
    } else loose.push(...split(l));
  }
  if (loose.length) groups.push({ group: groups.length ? "Other" : "Skills", items: loose });
  const seen = new Set<string>();
  return groups.map((g) => ({ ...g, items: g.items.filter((i) => (seen.has(i.toLowerCase()) ? false : (seen.add(i.toLowerCase()), true))).slice(0, 60) })).filter((g) => g.items.length).slice(0, 8);
}

function parseProjects(lines: string[]) {
  const out: NonNullable<ResumeContent["projects"]> = [];
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (isBullet(l)) {
      if (!out.length) out.push({ name: "Projects", bullets: [] });
      out[out.length - 1].bullets.push(stripBullet(l));
    } else if (out.length && out[out.length - 1].bullets.length && /^[a-z(]/.test(l)) {
      const b = out[out.length - 1].bullets;
      b[b.length - 1] += ` ${l}`;
    } else out.push({ name: l.slice(0, 120), bullets: [] });
  }
  return out.slice(0, 8);
}

export function parseResumeText(text: string): ResumeContent {
  const content = emptyResume();
  const cleaned = text.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
  const lines = cleaned.split("\n").map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim());

  const email = cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phone = cleaned.match(/(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?){1,3}\d{3,5}(?!\d)/);
  if (email) content.email = email[0];
  if (phone && phone[0].replace(/\D/g, "").length >= 9) content.phone = phone[0].trim();
  content.links = [...new Set([...cleaned.matchAll(/(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/|gitlab\.com\/)[A-Za-z0-9_./%-]+/gi)].map((m) => m[0].replace(/[.,;)]+$/, "")))].slice(0, 4);

  const buckets: Record<SectionKey | "preamble", string[]> = { preamble: [], summary: [], experience: [], skills: [], education: [], certifications: [], projects: [], additional: [] };
  const additional: { heading: string; lines: string[] }[] = [];
  let section: SectionKey | "preamble" = "preamble";
  for (const line of lines) {
    const h = headingOf(line.trim());
    if (h) {
      section = h.key;
      if (h.key === "additional") additional.push({ heading: h.label, lines: [] });
      continue;
    }
    if (section === "additional" && additional.length) additional[additional.length - 1].lines.push(stripBullet(line.trim()));
    else buckets[section].push(line);
  }

  // Header block: name, headline, location.
  const isContact = (l: string) => /@|https?:|linkedin\.com|github\.com|^\+?[\d\s()-]{8,}$/i.test(l) || (phone && l.includes(phone[0]));
  const pre = buckets.preamble.map((l) => l.trim());
  const nameLine = pre.find((l) => !isContact(l) && l.length <= 70) ?? "";
  content.name = nameLine.replace(/\s+/g, " ").replace(/^(resume|curriculum vitae|cv)\s*[:-]?\s*/i, "");
  const after = pre.slice(pre.indexOf(nameLine) + 1);
  for (const l of after) {
    const parts = l.split(/\s*[|•·]\s*/).map((p) => p.trim()).filter(Boolean);
    const nonContact = parts.filter((p) => !isContact(p));
    if (!content.location) {
      const loc = nonContact.find((p) => LOCATION_HINT.test(p) && p.length < 60 && !TITLE_WORDS.test(p));
      if (loc) content.location = loc;
    }
    if (!content.headline && nonContact.length && !isContact(l) && l.length < 100 && nonContact[0] !== content.location && (TITLE_WORDS.test(l) || nonContact.length === 1)) content.headline = nonContact.filter((p) => p !== content.location).join(" | ");
  }
  if (!content.location) {
    const m = cleaned.slice(0, 600).match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?),\s*(India|UAE|UK|Karnataka|Maharashtra|Delhi|Telangana|Tamil Nadu|Haryana|Uttar Pradesh)\b/);
    if (m) content.location = m[0];
  }

  const summaryLines = buckets.summary.length ? buckets.summary : [];
  content.summary = summaryLines.map((l) => stripBullet(l.trim())).join(" ").replace(/\s+/g, " ").slice(0, 1200);
  content.skills = parseSkills(buckets.skills);
  content.experience = parseExperience(buckets.experience).slice(0, 12);
  content.education = parseEducation(buckets.education);
  content.certifications = buckets.certifications.map((l) => stripBullet(l.trim())).filter((l) => l.length > 2).slice(0, 15);
  const projects = parseProjects(buckets.projects);
  if (projects.length) content.projects = projects;
  const extras = additional.filter((a) => a.lines.length);
  if (extras.length) content.additional = extras;
  if (!content.headline) content.headline = content.experience[0]?.title ?? "";
  return content;
}
