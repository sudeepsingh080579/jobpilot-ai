/** Public ATS job-board clients (no auth). Server-side only. */
export type Ats = "greenhouse" | "lever" | "ashby" | "smartrecruiters";
export const ATS_LIST: Ats[] = ["greenhouse", "lever", "ashby", "smartrecruiters"];

export type Posting = {
  ats: Ats;
  board: string;
  externalId: string;
  title: string;
  location: string;
  url: string;
  /** Plain text; may be empty until details are fetched. */
  description: string;
  workplace: string;
};

const UA = { "User-Agent": "JobPilotAI-JobHunt/1.0 (+https://jobpilot-ai-murex.vercel.app)" };

export function boardUrl(ats: Ats, token: string) {
  const t = encodeURIComponent(token);
  switch (ats) {
    case "greenhouse": return `https://boards-api.greenhouse.io/v1/boards/${t}/jobs`;
    case "lever": return `https://api.lever.co/v0/postings/${t}?mode=json`;
    case "ashby": return `https://api.ashbyhq.com/posting-api/job-board/${t}`;
    case "smartrecruiters": return `https://api.smartrecruiters.com/v1/companies/${t}/postings?limit=100`;
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

async function getJson(url: string, f: Fetcher): Promise<unknown> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const res = await f(url, { headers: UA, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  cache.set(url, { at: Date.now(), data });
  if (cache.size > 500) cache.delete(cache.keys().next().value as string);
  return data;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listPostings(ats: Ats, token: string, f: Fetcher = fetch): Promise<Posting[]> {
  const data: any = await getJson(boardUrl(ats, token), f);
  switch (ats) {
    case "greenhouse":
      return (data.jobs ?? []).map((j: any) => ({ ats, board: token, externalId: String(j.id), title: j.title ?? "", location: j.location?.name ?? "", url: j.absolute_url ?? "", description: "", workplace: "" }));
    case "lever":
      return (Array.isArray(data) ? data : []).map((j: any) => ({
        ats, board: token, externalId: String(j.id), title: j.text ?? "",
        location: [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean).filter((v: string, i: number, a: string[]) => a.indexOf(v) === i).join("; "),
        url: j.hostedUrl ?? "", description: [j.descriptionPlain, ...(j.lists ?? []).map((l: any) => `${l.text} ${htmlToPlain(l.content ?? "")}`), j.additionalPlain].filter(Boolean).join(" "),
        workplace: j.workplaceType ?? "",
      }));
    case "ashby":
      return (data.jobs ?? []).map((j: any) => ({
        ats, board: token, externalId: String(j.id), title: j.title ?? "",
        location: [j.location, ...(j.secondaryLocations ?? []).map((s: any) => s.location)].filter(Boolean).join("; ") + (j.address?.postalAddress?.addressCountry ? `; ${j.address.postalAddress.addressCountry}` : ""),
        url: j.jobUrl ?? j.applyUrl ?? "", description: j.descriptionPlain ?? htmlToPlain(j.descriptionHtml ?? ""),
        workplace: j.workplaceType ?? (j.isRemote ? "Remote" : ""),
      }));
    case "smartrecruiters":
      return (data.content ?? []).map((j: any) => ({
        ats, board: token, externalId: String(j.id), title: j.name ?? "",
        location: [j.location?.city, j.location?.region, j.location?.country === "in" ? "India" : j.location?.country, j.location?.remote ? "Remote" : ""].filter(Boolean).join(", "),
        url: `https://jobs.smartrecruiters.com/${token}/${j.id}`, description: "", workplace: j.location?.remote ? "Remote" : j.location?.hybrid ? "Hybrid" : "",
      }));
  }
}

export type Details = { description: string; questions: string[] };

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
  return { description: p.description, questions: [] };
}

export async function verifyBoard(ats: Ats, token: string, f: Fetcher = fetch) {
  try {
    const res = await f(boardUrl(ats, token), { headers: UA, signal: AbortSignal.timeout(12_000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
