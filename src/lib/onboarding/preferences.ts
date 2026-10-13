/**
 * Onboarding preferences (spec §4). Pure validation shared by the wizard and
 * the server action. Remote options are flags, never entries in `locations`.
 */
export const MAX_LOCATIONS = 10;
export const WORK_ARRANGEMENTS = ["remote", "hybrid", "onsite"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract"] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const WORK_LABEL: Record<WorkArrangement, string> = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site" };
export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = { full_time: "Full-time", part_time: "Part-time", contract: "Contract" };

/** Suggestions only; users may type any city. Not a claim about job availability. */
export const CITY_SUGGESTIONS = ["Bengaluru", "Mumbai", "Delhi NCR", "Gurugram", "Noida", "Hyderabad", "Pune", "Chennai", "Kolkata", "Ahmedabad", "Kochi", "Jaipur", "Chandigarh", "Indore", "Coimbatore"];

export const STEPS = ["Resume", "Target roles", "Locations", "Work style", "Experience & pay", "Skills & industries", "Review"] as const;

export type PreferencesInput = {
  targetRoles: string[];
  locations: string[];
  remoteIndia: boolean;
  remoteInternational: boolean;
  workArrangements: string[];
  employmentTypes: string[];
  experienceYears: number;
  currentCtcLakhs: number | null;
  expectedCtcLakhs: number | null;
  noticePeriodDays: number | null;
  industries: string[];
  skills: string[];
  willingToRelocate: boolean;
};

const REMOTE_WORDS = /^(remote|wfh|work from home|anywhere)\b/i;

function cleanList(list: unknown, max: number, maxLen = 80) {
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().replace(/\s+/g, " ").slice(0, maxLen);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

function num(v: unknown, min: number, max: number): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

export type ValidationResult = { ok: true; value: PreferencesInput } | { ok: false; errors: string[] };

export function validatePreferences(input: Partial<Record<keyof PreferencesInput, unknown>>, opts: { requireComplete?: boolean } = {}): ValidationResult {
  const errors: string[] = [];
  const rawLocations = Array.isArray(input.locations) ? input.locations : [];
  const nonRemote = rawLocations.filter((l) => typeof l === "string" && !REMOTE_WORDS.test(l.trim()));
  if (nonRemote.length !== rawLocations.length) errors.push("Remote is chosen with the remote options, not as a city.");
  const locations = cleanList(nonRemote, Number.MAX_SAFE_INTEGER);
  if (locations.length > MAX_LOCATIONS) errors.push(`Choose at most ${MAX_LOCATIONS} locations.`);
  const wa = cleanList(input.workArrangements, 3).filter((w): w is WorkArrangement => (WORK_ARRANGEMENTS as readonly string[]).includes(w));
  const et = cleanList(input.employmentTypes, 3).filter((w): w is EmploymentType => (EMPLOYMENT_TYPES as readonly string[]).includes(w));
  const value: PreferencesInput = {
    targetRoles: cleanList(input.targetRoles, 5),
    locations,
    remoteIndia: input.remoteIndia === true,
    remoteInternational: input.remoteInternational === true,
    workArrangements: wa,
    employmentTypes: et,
    experienceYears: num(input.experienceYears, 0, 60) ?? 0,
    currentCtcLakhs: num(input.currentCtcLakhs, 0, 1000),
    expectedCtcLakhs: num(input.expectedCtcLakhs, 0, 1000),
    noticePeriodDays: num(input.noticePeriodDays, 0, 365),
    industries: cleanList(input.industries, 10),
    skills: cleanList(input.skills, 40),
    willingToRelocate: input.willingToRelocate === true,
  };
  if (opts.requireComplete) {
    if (!value.targetRoles.length) errors.push("Add at least one target role.");
    if (!value.locations.length && !value.remoteIndia && !value.remoteInternational) errors.push("Add a city or choose a remote option.");
    if (!value.workArrangements.length) errors.push("Pick at least one work arrangement.");
    if (!value.employmentTypes.length) errors.push("Pick at least one employment type.");
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

/** Move a chip within the ordered list (used by reorder buttons/drag). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function addLocation(list: string[], city: string): { list: string[]; error?: string } {
  const v = city.trim().replace(/\s+/g, " ");
  if (!v) return { list };
  if (REMOTE_WORDS.test(v)) return { list, error: "Use the Remote (India) or Remote (International) options for remote work." };
  if (list.some((l) => l.toLowerCase() === v.toLowerCase())) return { list, error: `${v} is already added.` };
  if (list.length >= MAX_LOCATIONS) return { list, error: `You can add up to ${MAX_LOCATIONS} locations.` };
  return { list: [...list, v] };
}
