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
  /** Cities or countries the user chose (JobPreferences.locations). Empty = the home country, anywhere. */
  chosenLocations?: string[];
  /** Remote roles based in another allowed country (default true). */
  remoteAbroad?: boolean;
  /** Hybrid roles based in another allowed country (default false). */
  hybridAbroad?: boolean;
};

export type LocationDecision = { ok: true; country: string; note: string } | { ok: false; reason: string };

/** City alias groups: a chosen city matches any alias in its group. */
const CITY_GROUPS: string[][] = [
  ["bengaluru", "bangalore"],
  ["gurugram", "gurgaon"],
  ["delhi ncr", "ncr", "delhi", "new delhi", "noida", "gurugram", "gurgaon", "ghaziabad", "faridabad", "greater noida"],
  ["mumbai", "bombay", "navi mumbai", "thane"],
  ["chennai", "madras"],
  ["kolkata", "calcutta"],
  ["pune", "pimpri"],
  ["kochi", "cochin"],
  ["thiruvananthapuram", "trivandrum"],
  ["munich", "münchen"],
  ["cologne", "köln"],
];
const COUNTRY_ALIASES: Record<string, string> = { uae: "United Arab Emirates", uk: "United Kingdom", "great britain": "United Kingdom", england: "United Kingdom", holland: "Netherlands", deutschland: "Germany", usa: "United States", us: "United States" };

function chosenCountry(item: string): string | null {
  const l = item.trim().toLowerCase();
  if (COUNTRY_ALIASES[l]) return COUNTRY_ALIASES[l];
  return Object.keys(COUNTRY_TERMS).find((c) => c.toLowerCase() === l && c !== "Other") ?? null;
}

/** True when the posting's location text names a city or country the user chose. */
export function matchesChosenLocation(location: string, chosen: string[]): boolean {
  const l = location.toLowerCase();
  for (const raw of chosen) {
    const item = raw.trim().toLowerCase();
    if (!item || item === "remote") continue;
    const country = chosenCountry(item);
    if (country) {
      if (detectCountries(location).includes(country)) return true;
      continue;
    }
    const group = CITY_GROUPS.find((g) => g.includes(item)) ?? [item];
    if (group.some((t) => hasTerm(l, t))) return true;
  }
  return false;
}

/**
 * Location rule.
 * - Onsite (and hybrid in the home country): only in a city or country the user chose.
 *   With no choices, the home country anywhere.
 * - Remote in the home country: allowed. Remote in another allowed country: `remoteAbroad` (default on).
 * - Hybrid in another allowed country: `hybridAbroad` (default off), or when the user chose that place.
 * - Countries outside the allowed list are skipped; the US only with stated visa sponsorship.
 */
export function locationDecision(location: string, workplace: string, description: string, prefs: HuntPrefs): LocationDecision {
  const countries = detectCountries(location);
  const allowed = countries.filter((c) => prefs.allowedCountries.includes(c));
  const sponsor = sponsorshipSignal(description);
  const blob = `${location} ${workplace}`;
  const mode: "remote" | "hybrid" | "onsite" = /hybrid/i.test(blob) ? "hybrid" : /remote/i.test(blob) ? "remote" : "onsite";
  const chosen = (prefs.chosenLocations ?? []).map((c) => c.trim()).filter(Boolean);
  const home = prefs.homeCountry;
  let country = allowed.includes(home) ? home : allowed[0] ?? "";
  if (!country) {
    if (countries.includes("United States")) {
      if (!(prefs.allowUsWithSponsorship && sponsor === "yes")) return { ok: false, reason: "US role without stated visa sponsorship" };
      country = "United States";
    } else if (countries.length) return { ok: false, reason: `Location outside allowed countries (${location.slice(0, 80)})` };
    else if (mode === "remote") return { ok: false, reason: "Remote, but the posting does not say which countries are eligible" };
    else return { ok: false, reason: "Location not stated" };
  }
  if (prefs.needsSponsorship && country !== home && sponsor === "no") {
    return { ok: false, reason: `Posting says no visa sponsorship (needed outside ${home})` };
  }
  const abroad = country !== home;
  const picked = chosen.length ? matchesChosenLocation(location, chosen) : false;
  const summary = chosen.length ? chosen.join(", ") : home;
  const fine = (why: string) => ({ ok: true as const, country, note: `${country} · ${mode}${sponsor === "yes" ? " · sponsorship mentioned" : ""}${why ? ` · ${why}` : ""}` });

  if (mode === "remote") {
    if (!abroad) return fine("");
    if (prefs.remoteAbroad ?? true) return fine("remote abroad allowed");
    if (picked) return fine("in your locations");
    return { ok: false, reason: `Remote in ${country}; remote-abroad is off in your settings` };
  }
  if (mode === "hybrid" && abroad) {
    if (prefs.hybridAbroad) return fine("hybrid abroad allowed");
    if (picked) return fine("in your locations");
    return { ok: false, reason: `Hybrid in ${country}; hybrid-abroad is off in your settings` };
  }
  // Onsite anywhere, or hybrid at home: needs a chosen city/country.
  if (!chosen.length) {
    if (!abroad) return fine("home country");
    return { ok: false, reason: `Onsite in ${location.slice(0, 60)}; ${country} is not in your locations` };
  }
  if (picked) return fine("in your locations");
  return { ok: false, reason: `${mode === "hybrid" ? "Hybrid" : "Onsite"} in ${location.slice(0, 60)}; not in your locations (${summary})` };
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
