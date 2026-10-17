/** Pure, deterministic Job Hunt rules: location, sponsorship, scoring, dedup. */
import { createHash } from "node:crypto";
import { SKILL_DICTIONARY } from "@/lib/scoring/ats";

const COUNTRY_TERMS: Record<string, string[]> = {
  India: ["india", "bengaluru", "bangalore", "mumbai", "pune", "hyderabad", "chennai", "gurugram", "gurgaon", "noida", "delhi", "kolkata", "ahmedabad", "kochi", "jaipur", "chandigarh"],
  "United Arab Emirates": ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah"],
  "United Kingdom": ["united kingdom", "uk", "england", "scotland", "london", "manchester", "edinburgh", "cambridge", "bristol", "belfast", "glasgow", "leeds"],
  Germany: ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "frankfurt", "cologne", "köln", "stuttgart", "düsseldorf"],
  Netherlands: ["netherlands", "amsterdam", "rotterdam", "utrecht", "the hague", "eindhoven"],
  "United States": ["united states", "usa", "u.s.", "us-remote", "remote - us", "remote (us", "new york", "san francisco", "seattle", "austin", "boston", "chicago", "los angeles", "denver", "atlanta", "miami", "washington, dc", "palo alto", "mountain view", "menlo park", "sunnyvale", "san jose", "oakland", "brooklyn", "nyc", "sf bay"],
  Other: ["canada", "toronto", "vancouver", "mexico", "brazil", "são paulo", "singapore", "australia", "sydney", "melbourne", "japan", "tokyo", "france", "paris", "spain", "madrid", "barcelona", "ireland", "dublin", "poland", "warsaw", "portugal", "lisbon", "israel", "tel aviv", "sweden", "stockholm", "philippines", "manila", "korea", "seoul", "indonesia", "jakarta", "argentina", "colombia", "lithuania", "vilnius", "estonia", "tallinn", "switzerland", "zurich", "italy", "milan", "czech", "prague", "romania", "turkey", "istanbul", "malaysia", "hong kong", "taiwan", "new zealand", "chile", "austria", "vienna", "belgium", "brussels", "denmark", "copenhagen", "finland", "norway", "oslo", "greece", "athens", "costa rica", "south africa", "egypt", "saudi", "riyadh", "qatar", "doha", "bahrain", "kenya", "nigeria"],
};
const US_STATE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;

function hasTerm(text: string, term: string) {
  if (term.length <= 3) return new RegExp(`(^|[^a-z])${term.replace(/\./g, "\\.")}([^a-z]|$)`).test(text);
  return text.includes(term);
}

/** Countries mentioned in a posting's location string (may be several; "Remote" alone → []). */
export function detectCountries(location: string): string[] {
  const l = location.toLowerCase();
  const out = Object.entries(COUNTRY_TERMS).filter(([, terms]) => terms.some((t) => hasTerm(l, t))).map(([c]) => c);
  if (US_STATE.test(location) && !out.includes("United States")) out.push("United States");
  return out;
}

const SPONSOR_YES = /(visa sponsorship (is )?(available|provided|offered)|we (will|can|do) sponsor|sponsorship (is )?available|offer(s)? visa sponsorship|relocation and visa support|visa support)/i;
const SPONSOR_NO = /(no (visa )?sponsorship|not (able|eligible) to (provide |offer )?(visa )?sponsor|unable to (provide |offer )?(visa )?sponsor|(will|can|do) not (provide |offer )?(visa )?sponsor|without (the need for )?(visa )?sponsorship|sponsorship (is )?not (available|provided|offered)|must (already )?have (the )?right to work)/i;

export function sponsorshipSignal(text: string): "yes" | "no" | "unknown" {
  if (SPONSOR_NO.test(text)) return "no";
  if (SPONSOR_YES.test(text)) return "yes";
  return "unknown";
}

export type HuntPrefs = {
  allowedCountries: string[];
  allowUsWithSponsorship: boolean;
  needsSponsorship: boolean;
  homeCountry: string;
};

export type LocationDecision = { ok: true; country: string; note: string } | { ok: false; reason: string };

export function locationDecision(location: string, workplace: string, description: string, prefs: HuntPrefs): LocationDecision {
  const countries = detectCountries(location);
  const allowed = countries.filter((c) => prefs.allowedCountries.includes(c));
  const sponsor = sponsorshipSignal(description);
  const remote = /remote/i.test(`${location} ${workplace}`);
  let country = allowed[0] ?? "";
  if (!country) {
    if (countries.includes("United States")) {
      if (prefs.allowUsWithSponsorship && sponsor === "yes") country = "United States";
      else return { ok: false, reason: "US role without stated visa sponsorship" };
    } else if (countries.length) return { ok: false, reason: `Location outside allowed countries (${location.slice(0, 80)})` };
    else if (remote) return { ok: false, reason: "Remote, but the posting does not say which countries are eligible" };
    else return { ok: false, reason: "Location not stated" };
  }
  if (prefs.needsSponsorship && country !== prefs.homeCountry && sponsor === "no") {
    return { ok: false, reason: `Posting says no visa sponsorship (needed outside ${prefs.homeCountry})` };
  }
  const mode = /hybrid/i.test(`${location} ${workplace}`) ? "hybrid" : remote ? "remote" : "onsite";
  return { ok: true, country, note: `${country} · ${mode}${sponsor === "yes" ? " · sponsorship mentioned" : ""}` };
}

const STOP = new Set(["senior", "sr", "junior", "jr", "lead", "staff", "principal", "head", "of", "and", "the", "a", "ii", "iii", "iv", "i", "&", "-", "/", "manager", "engineer", "specialist", "associate", "intern"]);
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);

/** Title relevance to target roles: 0..1 (core words like "product", "devops", "data" must overlap). */
export function titleRelevance(title: string, targetRoles: string[]) {
  const t = new Set(tokens(title));
  let best = 0;
  for (const role of targetRoles) {
    const all = tokens(role);
    const core = all.filter((w) => !STOP.has(w));
    if (!core.length) continue;
    const coreHit = core.filter((w) => t.has(w)).length / core.length;
    const allHit = all.filter((w) => t.has(w)).length / all.length;
    best = Math.max(best, coreHit === 0 ? 0 : 0.7 * coreHit + 0.3 * allHit);
  }
  return best;
}

export type ScoreDetail = { score: number; title: number; skills: number; matched: string[]; missing: string[]; method: "keyword" };

/** Deterministic resume-vs-JD score used when no LLM is configured (LLM_MOCK). */
export function scoreRole(input: { title: string; description: string; resumeText: string; resumeSkills: string[]; targetRoles: string[] }): ScoreDetail {
  const jd = `${input.title} ${input.description}`.toLowerCase();
  const resume = input.resumeText.toLowerCase();
  const vocab = [...new Set([...SKILL_DICTIONARY, ...input.resumeSkills.map((s) => s.toLowerCase().trim()).filter((s) => s.length > 1)])];
  const inJd = vocab.filter((term) => hasTerm(jd, term));
  const matched = inJd.filter((term) => hasTerm(resume, term));
  const missing = inJd.filter((term) => !hasTerm(resume, term));
  const skills = inJd.length ? matched.length / inJd.length : 0;
  const title = titleRelevance(input.title, input.targetRoles);
  const score = Math.round(100 * (0.45 * title + 0.55 * skills));
  return { score, title: Math.round(title * 100), skills: Math.round(skills * 100), matched: matched.slice(0, 25), missing: missing.slice(0, 15), method: "keyword" };
}

export function dedupKey(p: { ats: string; board: string; externalId: string; url: string }) {
  return createHash("sha256").update(`${p.ats}|${p.board.toLowerCase()}|${p.externalId}|${p.url.split("?")[0]}`).digest("hex").slice(0, 40);
}

const NEEDS_INPUT: [RegExp, string][] = [
  [/password/i, "Create a password on the employer site"],
  [/(verification|confirmation) code|one[- ]time code|otp/i, "Email/phone verification code"],
  [/(street|home|postal|mailing) address|address line/i, "Street address"],
];

/** What the user must fill themselves. Salary is flagged only when no salary answer exists. */
export function needsInputFor(questions: string[], hasSalaryAnswer: boolean): string[] {
  const out = new Set<string>();
  for (const q of questions) {
    for (const [re, label] of NEEDS_INPUT) if (re.test(q)) out.add(label);
    if (/salary|compensation|ctc|pay expectation/i.test(q) && !hasSalaryAnswer) out.add("Salary expectation (not in saved answers)");
  }
  return [...out];
}
