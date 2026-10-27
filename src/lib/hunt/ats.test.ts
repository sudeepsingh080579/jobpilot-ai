import { describe, expect, it } from "vitest";
import { isFresh, listPostings, parseWorkdayPostedOn, parseWorkdayToken, postingDetails } from "./ats";

const NOW = new Date("2026-10-27T10:00:00Z");
const day = 86_400_000;
const iso = (d: number) => new Date(NOW.getTime() - d * day).toISOString();
const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
const fake = (routes: (url: string, init?: RequestInit) => unknown): typeof fetch => (async (url: string, init?: RequestInit) => json(routes(String(url), init))) as unknown as typeof fetch;

describe("posting dates per ATS", () => {
  it("greenhouse uses first_published (not updated_at)", async () => {
    const f = fake(() => ({ jobs: [
      { id: 1, title: "SRE", location: { name: "Bengaluru" }, absolute_url: "u1", first_published: iso(1), updated_at: iso(0) },
      { id: 2, title: "Old", location: { name: "Pune" }, absolute_url: "u2", updated_at: iso(0) },
    ] }));
    const r = await listPostings("greenhouse", "t-gh", f);
    expect(r[0].dateKind).toBe("exact");
    expect(isFresh(r[0], 3, NOW)).toBe(true);
    expect(r[1].dateKind).toBe("unknown");
    expect(isFresh(r[1], 3, NOW)).toBe(false);
  });
  it("lever createdAt, ashby publishedAt", async () => {
    const lever = await listPostings("lever", "t-lv", fake(() => [{ id: "a", text: "SRE", categories: { location: "Pune" }, hostedUrl: "u", createdAt: NOW.getTime() - 5 * day }]));
    expect(isFresh(lever[0], 3, NOW)).toBe(false);
    expect(isFresh(lever[0], 7, NOW)).toBe(true);
    const ashby = await listPostings("ashby", "t-ab", fake(() => ({ jobs: [{ id: "b", title: "SRE", location: "Remote", jobUrl: "u", publishedAt: iso(2) }, { id: "c", title: "X", location: "Y", jobUrl: "u" }] })));
    expect(isFresh(ashby[0], 3, NOW)).toBe(true);
    expect(ashby[1].dateKind).toBe("unknown");
  });
  it("smartrecruiters paginates and uses releasedDate", async () => {
    const page = (n: number) => Array.from({ length: 100 }, (_, i) => ({ id: `p${n}-${i}`, name: "Eng", location: { city: "Pune", country: "in" }, releasedDate: iso(1) }));
    const calls: string[] = [];
    const f = fake((u) => {
      calls.push(u);
      const off = Number(new URL(u).searchParams.get("offset"));
      return { totalFound: 130, content: off === 0 ? page(0) : page(1).slice(0, 30) };
    });
    const r = await listPostings("smartrecruiters", "t-sr", f);
    expect(r).toHaveLength(130);
    expect(calls).toHaveLength(2);
    expect(isFresh(r[0], 3, NOW)).toBe(true);
  });
  it("parses Workday relative dates and tokens", () => {
    expect(parseWorkdayToken("acme|wd5|Careers")).toMatchObject({ host: "https://acme.wd5.myworkdayjobs.com", site: "Careers" });
    expect(() => parseWorkdayToken("bad")).toThrow();
    expect(parseWorkdayPostedOn("Posted Today", NOW).postedAt?.getTime()).toBe(NOW.getTime());
    expect(parseWorkdayPostedOn("Posted 2 Days Ago", NOW).postedAt?.getTime()).toBe(NOW.getTime() - 2 * day);
    expect(parseWorkdayPostedOn("Posted 30+ Days Ago", NOW).minAgeDays).toBe(30);
    expect(parseWorkdayPostedOn("", NOW).dateKind).toBe("unknown");
  });
  it("workday lists newest-first pages, stops when a page is stale, fetches details", async () => {
    const mk = (n: number, posted: string) => Array.from({ length: 20 }, (_, i) => ({ title: `Eng ${n}-${i}`, externalPath: `/job/x/${n}-${i}`, locationsText: "2 Locations", postedOn: posted, bulletFields: [`R${n}-${i}`] }));
    const calls: number[] = [];
    const f = fake((u, init) => {
      if (init?.method === "POST") {
        const off = JSON.parse(String(init.body)).offset;
        calls.push(off);
        return { total: 500, jobPostings: off === 0 ? mk(0, "Posted Today") : off === 20 ? mk(1, "Posted 2 Days Ago") : mk(2, "Posted 30+ Days Ago") };
      }
      return { jobPostingInfo: { jobDescription: "<p>Kubernetes and AWS</p>", startDate: iso(1).slice(0, 10), location: "Pune, India", additionalLocations: ["Mumbai, India"], country: { descriptor: "India" } } };
    });
    const r = await listPostings("workday", "acme|wd5|Careers", f, { freshnessDays: 3, now: NOW });
    expect(calls).toEqual([0, 20, 40]); // third page is entirely stale → stop there
    expect(r).toHaveLength(60);
    expect(r[0].url).toBe("https://acme.wd5.myworkdayjobs.com/Careers/job/x/0-0");
    expect(isFresh(r[0], 3, NOW)).toBe(true);
    expect(isFresh(r[59], 3, NOW)).toBe(false);
    const d = await postingDetails(r[0], f);
    expect(d.description).toContain("Kubernetes");
    expect(d.location).toContain("Pune");
    expect(d.dateKind).toBe("exact");
  });
});

import { fetchProviderPostings, searchAdzunaPostings, searchJSearchPostings } from "./providers";
describe("aggregator providers (mocked fetch)", () => {
  it("adzuna maps created date and requests max_days_old", async () => {
    let url = "";
    const f = fake((u) => { url = u; return { results: [{ id: 9, title: "SRE", company: { display_name: "Acme" }, location: { display_name: "Pune, Maharashtra" }, description: "Kubernetes", redirect_url: "https://x", created: iso(1) }] }; });
    const r = await searchAdzunaPostings({ role: "SRE", location: "Pune", days: 3 }, f);
    expect(url).toContain("max_days_old=3");
    expect(r[0]).toMatchObject({ ats: "adzuna", company: "Acme", dateKind: "exact" });
  });
  it("jsearch maps posted timestamp and asks for 3days", async () => {
    let url = "";
    const f = fake((u) => { url = u; return { data: [{ job_id: "j1", job_title: "SRE", employer_name: "Beta", job_city: "Pune", job_country: "IN", job_description: "AWS", job_apply_link: "https://y", job_posted_at_datetime_utc: iso(2) }] }; });
    const r = await searchJSearchPostings({ role: "SRE", location: "Pune", days: 3 }, f);
    expect(url).toContain("date_posted=3days");
    expect(r[0]).toMatchObject({ ats: "jsearch", company: "Beta", dateKind: "exact" });
  });
  it("does nothing without keys", async () => {
    delete process.env.ADZUNA_APP_ID; delete process.env.JSEARCH_API_KEY;
    const r = await fetchProviderPostings({ roles: ["SRE"], locations: [], days: 3 }, fake(() => ({})));
    expect(r).toMatchObject({ postings: [], used: [] });
  });
});
