/** Public ATS job-board clients (no auth). Server-side only. */
export type Ats = "greenhouse" | "lever" | "ashby" | "smartrecruiters" | "workday";
export const ATS_LIST: Ats[] = ["greenhouse", "lever", "ashby", "smartrecruiters", "workday"];

/** exact = a timestamp from the employer's ATS; approx = day-level ("Posted 2 Days Ago"); unknown = no reliable date. */
export type DateKind = "exact" | "approx" | "unknown";

export type ProviderId = "adzuna" | "jsearch";
export type Posting = {
  ats: Ats | ProviderId;
  board: string;
  externalId: string;
  title: string;
  location: string;
  url: string;
  /** Plain text; may be empty until details are fetched. */
  description: string;
  workplace: string;
  postedAt?: Date | null;
  dateKind?: DateKind;
  /** Workday: the posting's API path, used to fetch details. */
  path?: string;
  /** Aggregator results carry the employer name. */
  company?: string;
};

/** Workday tokens are `tenant|wdN|site`. */
export function parseWorkdayToken(token: string) {
  const [tenant, wd, site] = token.split("|");
  if (!tenant || !wd || !site || !/^wd\d+$/.test(wd)) throw new Error("Bad Workday token (expected tenant|wdN|site)");
  return { tenant, wd, site, host: `https://${tenant}.${wd}.myworkdayjobs.com` };
}

/** "Posted Today" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" → a day-level date. */
export function parseWorkdayPostedOn(text: string, now = new Date()): { postedAt: Date | null; dateKind: DateKind; minAgeDays?: number } {
  const t = (text ?? "").toLowerCase();
  const day = 86_400_000;
  if (/today/.test(t)) return { postedAt: new Date(now.getTime()), dateKind: "approx" };
  if (/yesterday/.test(t)) return { postedAt: new Date(now.getTime() - day), dateKind: "approx" };
  const m = t.match(/(\d+)(\+)?\s*days?\s*ago/);
  if (m) return { postedAt: new Date(now.getTime() - Number(m[1]) * day), dateKind: "approx", minAgeDays: m[2] ? Number(m[1]) : undefined };
  return { postedAt: null, dateKind: "unknown" };
}

/** Posting is within the freshness window. Unknown dates are never "fresh". */
export function isFresh(p: { postedAt?: Date | null; dateKind?: DateKind }, days: number, now = new Date()) {
  if (!p.postedAt || p.dateKind === "unknown") return false;
  const age = (now.getTime() - p.postedAt.getTime()) / 86_400_000;
  return age <= days + 1e-6;
}

const toDate = (v: unknown): Date | null => {
  if (v == null || v === "") return null;
  const d = typeof v === "number" ? new Date(v) : new Date(String(v));
  return Number.isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getTime() > Date.now() + 2 * 86_400_000 ? null : d;
};
const dated = (v: unknown): { postedAt: Date | null; dateKind: DateKind } => {
  const d = toDate(v);
  return { postedAt: d, dateKind: d ? "exact" : "unknown" };
};

const UA = { "User-Agent": "JobPilotAI-JobHunt/1.0 (+https://jobpilot-ai-murex.vercel.app)" };

export function boardUrl(ats: Ats, token: string) {
  const t = encodeURIComponent(token);
  switch (ats) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`;
    case "lever": return `https://api.lever.co/v0/postings/${t}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${t}`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`;
    case "workday": { const w = parseWorkdayToken(token); return `${w.host}/wday/cxs/${w.tenant}/${w.site}/jobs`; }
  }
}

export function htmlToPlain(html: string) {
  return html
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Fetcher = typeof fetch;
const cache = new Map<string, { at: number; data: unknown }>();
const TTL = 30 * 60 * 1000;

async function getJson(url: string, f: Fetcher, body?: unknown): Promise<unknown> {
  const ck = body ? `${url}#${JSON.stringify(body)}` : url;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await f(url, body ? { method: "POST", headers: { ...UA, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) } : { headers: UA, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(ck, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export type ListOpts = { freshnessDays?: number; now?: Date };

export async function listPostings(ats: Ats, token: string, f: Fetcher = fetch, opts: ListOpts = {}): Promise<Posting[]> {
  if (ats === "workday") return listWorkday(token, f, opts);
  if (ats === "smartrecruiters") return listSmartRecruiters(token, f);
  const data: any = await getJson(boardUrl(ats, token), f);
  switch (ats) {
    case "greenhouse":
      return (data.jobs ?? []).map((j: any) => ({ ats, board: token, externalId: String(j.id), title: j.title ?? "", location: j.location?.name ?? "", url: j.absolute_url ?? "", description: "", workplace: "", ...dated(j.first_published) }));
    case "lever":
      return (Array.isArray(data) ? data : []).map((j: any) => ({
        ats, board: token, externalId: String(j.id), title: j.text ?? "",
        location: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("; "),
        url: j.hostedUrl ?? "", description: [j.descriptionPlain, ...(j.lists ?? []).map((l: any) => `${l.text} ${htmlToPlain(l.content ?? "")}`), j.additionalPlain].filter(Boolean).join(" "),
        workplace: j.workplaceType ?? "", ...dated(j.createdAt),
      }));
    default: // ashby
      return (data.jobs ?? []).map((j: any) => ({
        ats, board: token, externalId: String(j.id), title: j.title ?? "",
        location: [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location)].filter(Boolean).join("; ") + (j.address?.postalAddress?.addressCountry ? `; ${j.address.postalAddress.addressCountry}` : ""),
        url: j.jobUrl ?? j.applyUrl ?? "", description: j.descriptionPlain ?? htmlToPlain(j.descriptionHtml ?? ""),
        workplace: j.workplaceType ?? (j.isRemote ? "Remote" : ""), ...dated(j.publishedAt),
      }));
  }
}

const SR_PAGE = 100;
const SR_MAX_PAGES = 5;
async function listSmartRecruiters(token: string, f: Fetcher): Promise<Posting[]> {
  const out: Posting[] = [];
  for (let page = 0; page < SR_MAX_PAGES; page++) {
    const data: any = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=${SR_PAGE}&offset=${page * SR_PAGE}`, f);
    const rows: any[] = data.content ?? [];
    for (const j of rows) {
      out.push({
        ats: "smartrecruiters", board: token, externalId: String(j.id), title: j.name ?? "",
        location: [j.location?.city, j.location?.region, j.location?.country === "in" ? "India" : j.location?.country, j.location?.remote ? "Remote" : ""].filter(Boolean).join(", "),
        url: `https://jobs.smartrecruiters.com/${token}/${j.id}`, description: "", workplace: j.location?.remote ? "Remote" : j.location?.hybrid ? "Hybrid" : "",
        ...dated(j.releasedDate),
      });
    }
    if (rows.length < SR_PAGE || out.length >= (data.totalFound ?? 0)) break;
  }
  return out;
}

const WD_PAGE = 20;
const WD_MAX_PAGES = 6;
async function listWorkday(token: string, f: Fetcher, opts: ListOpts): Promise<Posting[]> {
  const w = parseWorkdayToken(token);
  const url = `${w.host}/wday/cxs/${w.tenant}/${w.site}/jobs`;
  const days = opts.freshnessDays ?? 3;
  const out: Posting[] = [];
  for (let page = 0; page < WD_MAX_PAGES; page++) {
    const data: any = await getJson(url, f, { appliedFacets: {}, limit: WD_PAGE, offset: page * WD_PAGE, searchText: "" });
    const rows: any[] = data.jobPostings ?? [];
    let allOld = rows.length > 0;
    for (const j of rows) {
      const d = parseWorkdayPostedOn(String(j.postedOn ?? ""), opts.now);
      if (d.dateKind === "unknown" || (d.postedAt && !isFresh(d, days, opts.now))) { /* older */ } else allOld = false;
      if (!j.externalPath) continue;
      out.push({
        ats: "workday", board: token, externalId: String(j.bulletFields?.[0] ?? j.externalPath), title: j.title ?? "",
        location: j.locationsText ?? "", url: `${w.host}/${w.site}${j.externalPath}`, description: "", workplace: "",
        postedAt: d.postedAt, dateKind: d.dateKind,
        path: j.externalPath,
      });
    }
    // results are newest first: stop once a whole page is outside the window
    if (rows.length < WD_PAGE || allOld) break;
  }
  return out;
}

export type Details = { description: string; questions: string[]; location?: string; postedAt?: Date | null; dateKind?: DateKind };

/** Full description (+ application questions on Greenhouse) for one shortlisted posting. */
export async function postingDetails(p: Posting, f: Fetcher = fetch): Promise<Details> {
  if (p.ats === "greenhouse") {
    const d: any = await getJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(p.board)}/jobs/${p.externalId}?questions=true`, f);
    const qs = [...(d.questions ?? []), ...(d.location_questions ?? [])].map((q: any) => String(q.label ?? "")).filter(Boolean);
    return { description: htmlToPlain(d.content ?? ""), questions: qs };
  }
  if (p.ats === "smartrecruiters") {
    const d: any = await getJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(p.board)}/postings/${p.externalId}`, f);
    const s = d.jobAd?.sections ?? {};
    return { description: htmlToPlain([s.companyDescription?.text, s.jobDescription?.text, s.qualifications?.text, s.additionalInformation?.text].filter(Boolean).join(" ")), questions: [] };
  }
  if (p.ats === "workday") {
    const w = parseWorkdayToken(p.board);
    const path = p.path ?? p.url.slice(`${w.host}/${w.site}`.length);
    const d: any = await getJson(`${w.host}/wday/cxs/${w.tenant}/${w.site}${path}`, f);
    const info = d.jobPostingInfo ?? {};
    const locs = [info.location, ...(info.additionalLocations ?? []), info.country?.descriptor].filter(Boolean);
    const start = toDate(info.startDate);
    return {
      description: htmlToPlain(info.jobDescription ?? ""), questions: [],
      location: locs.filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("; "),
      ...(start ? { postedAt: start, dateKind: "exact" as const } : {}),
    };
  }
  return { description: p.description, questions: [] };
}

export async function verifyBoard(ats: Ats, token: string, f: Fetcher = fetch) {
  try {
    const res = ats === "workday"
      ? await f(boardUrl(ats, token), { method: "POST", headers: { ...UA, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ appliedFacets: {}, limit: 1, offset: 0, searchText: "" }), signal: AbortSignal.timeout(12_000) })
      : await f(boardUrl(ats, token), { headers: UA, signal: AbortSignal.timeout(12_000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
