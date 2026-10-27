/**
 * Optional job-board aggregators for the hunt (real sources only, never invented).
 * Active only when their keys are set:
 *   Adzuna : ADZUNA_APP_ID, ADZUNA_APP_KEY, ADZUNA_COUNTRY (default "in")
 *   JSearch: JSEARCH_API_KEY, JSEARCH_API_HOST (default jsearch.p.rapidapi.com)
 * Both return a posted timestamp, so the same freshness filter applies.
 */
import { htmlToPlain, type Posting } from "@/lib/hunt/ats";

type Fetcher = typeof fetch;
/* eslint-disable @typescript-eslint/no-explicit-any */

export function huntProviderStatus() {
  return {
    adzuna: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
    jsearch: Boolean(process.env.JSEARCH_API_KEY),
  };
}

const okDate = (v: unknown) => {
  const d = v ? new Date(String(v)) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

export async function searchAdzunaPostings(q: { role: string; location: string; days: number }, f: Fetcher = fetch): Promise<Posting[]> {
  const country = (process.env.ADZUNA_COUNTRY || "in").toLowerCase();
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID ?? "", app_key: process.env.ADZUNA_APP_KEY ?? "",
    results_per_page: "30", what: q.role, max_days_old: String(Math.max(1, Math.ceil(q.days))), sort_by: "date",
  });
  if (q.location) params.set("where", q.location);
  const res = await f(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params}`, { signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.results ?? []).map((j: any): Posting => {
    const postedAt = okDate(j.created);
    const area: string[] = j.location?.area ?? [];
    return {
      ats: "adzuna", board: String(j.company?.display_name ?? "").toLowerCase(), externalId: String(j.id), title: htmlToPlain(j.title ?? ""),
      location: [j.location?.display_name, area[0]].filter(Boolean).join("; "), url: j.redirect_url ?? "",
      description: htmlToPlain(j.description ?? ""), workplace: /remote/i.test(`${j.title} ${j.description}`) ? "Remote" : "",
      postedAt, dateKind: postedAt ? "exact" : "unknown", company: j.company?.display_name ?? "Company",
    };
  });
}

export async function searchJSearchPostings(q: { role: string; location: string; days: number }, f: Fetcher = fetch): Promise<Posting[]> {
  const datePosted = q.days <= 1 ? "today" : q.days <= 3 ? "3days" : q.days <= 7 ? "week" : "month";
  const query = [q.role, q.location ? `in ${q.location}` : ""].filter(Boolean).join(" ");
  const host = process.env.JSEARCH_API_HOST || "jsearch.p.rapidapi.com";
  const res = await f(`https://${host}/search?query=${encodeURIComponent(query)}&page=1&num_pages=1&date_posted=${datePosted}`, {
    headers: { "X-RapidAPI-Key": process.env.JSEARCH_API_KEY ?? "", "X-RapidAPI-Host": host }, signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`JSearch HTTP ${res.status}`);
  const data: any = await res.json();
  return (data.data ?? []).map((j: any): Posting => {
    const postedAt = okDate(j.job_posted_at_datetime_utc);
    return {
      ats: "jsearch", board: String(j.employer_name ?? "").toLowerCase(), externalId: String(j.job_id), title: j.job_title ?? "",
      location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") + (j.job_is_remote ? "; Remote" : ""),
      url: j.job_apply_link ?? "", description: j.job_description ?? "", workplace: j.job_is_remote ? "Remote" : "",
      postedAt, dateKind: postedAt ? "exact" : "unknown", company: j.employer_name ?? "Company",
    };
  });
}

/** Bounded fan-out: ≤3 roles × ≤3 locations for Adzuna, ≤3 queries for JSearch (to protect free-tier quotas). */
export async function fetchProviderPostings(input: { roles: string[]; locations: string[]; days: number }, f: Fetcher = fetch) {
  const st = huntProviderStatus();
  const out: Posting[] = [];
  const errors: string[] = [];
  const used: string[] = [];
  const roles = input.roles.slice(0, 3);
  const locs = (input.locations.length ? input.locations : [""]).slice(0, 3);
  if (st.adzuna) {
    used.push("adzuna");
    for (const role of roles) for (const location of locs) {
      try { out.push(...(await searchAdzunaPostings({ role, location, days: input.days }, f))); } catch (e) { errors.push(e instanceof Error ? e.message : "Adzuna failed"); }
    }
  }
  if (st.jsearch) {
    used.push("jsearch");
    for (const role of roles.slice(0, 3)) {
      try { out.push(...(await searchJSearchPostings({ role, location: locs[0], days: input.days }, f))); } catch (e) { errors.push(e instanceof Error ? e.message : "JSearch failed"); }
    }
  }
  const seen = new Set<string>();
  return { postings: out.filter((p) => { const k = `${p.ats}:${p.externalId}`; if (seen.has(k)) return false; seen.add(k); return true; }), errors, used };
}
