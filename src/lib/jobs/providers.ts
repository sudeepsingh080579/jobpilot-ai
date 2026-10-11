import { SAMPLE_JOBS, searchCatalog, type JobQuery, type JobResult } from "@/lib/jobs/catalog";

export type ProviderStatus = { id: string; name: string; configured: boolean; note: string };

export function providerStatus(): ProviderStatus[] {
  return [
    {
      id: "sample",
      name: "Sample market",
      configured: true,
      note: "Original sample postings so search works with no keys.",
    },
    {
      id: "adzuna",
      name: "Adzuna",
      configured: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      note: "Set ADZUNA_APP_ID and ADZUNA_APP_KEY.",
    },
    {
      id: "jsearch",
      name: "JSearch",
      configured: Boolean(process.env.JSEARCH_API_KEY),
      note: "Set JSEARCH_API_KEY for the RapidAPI JSearch host.",
    },
  ];
}

async function searchAdzuna(query: JobQuery): Promise<JobResult[]> {
  const country = process.env.ADZUNA_COUNTRY || "us";
  const params = new URLSearchParams({
    app_id: process.env.ADZUNA_APP_ID ?? "",
    app_key: process.env.ADZUNA_APP_KEY ?? "",
    results_per_page: "15",
    what: [query.title, query.keywords].filter(Boolean).join(" "),
    where: query.location ?? "",
  });
  const response = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`);
  if (!response.ok) throw new Error(`Adzuna returned ${response.status}`);
  const payload = (await response.json()) as {
    results?: { id: string; title: string; company: { display_name: string }; location: { display_name: string }; description: string; redirect_url: string; salary_min?: number; salary_max?: number }[];
  };
  return (payload.results ?? []).map((job) => ({
    externalId: `adzuna-${job.id}`,
    title: job.title,
    company: job.company?.display_name ?? "Company",
    location: job.location?.display_name ?? "",
    workMode: /remote/i.test(`${job.title} ${job.description}`) ? "remote" : "unknown",
    experience: "",
    minYears: 0,
    salary: job.salary_min ? `${job.salary_min}–${job.salary_max ?? ""}` : "",
    url: job.redirect_url,
    source: "adzuna",
    description: job.description?.replace(/<[^>]+>/g, " ") ?? "",
  }));
}

async function searchJSearch(query: JobQuery): Promise<JobResult[]> {
  const q = [query.title, query.location, query.keywords].filter(Boolean).join(" ");
  const response = await fetch(`https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(q)}&num_pages=1`, {
    headers: {
      "X-RapidAPI-Key": process.env.JSEARCH_API_KEY ?? "",
      "X-RapidAPI-Host": process.env.JSEARCH_API_HOST || "jsearch.p.rapidapi.com",
    },
  });
  if (!response.ok) throw new Error(`JSearch returned ${response.status}`);
  const payload = (await response.json()) as {
    data?: { job_id: string; job_title: string; employer_name: string; job_city?: string; job_country?: string; job_description: string; job_apply_link: string; job_is_remote?: boolean }[];
  };
  return (payload.data ?? []).map((job) => ({
    externalId: `jsearch-${job.job_id}`,
    title: job.job_title,
    company: job.employer_name,
    location: [job.job_city, job.job_country].filter(Boolean).join(", "),
    workMode: job.job_is_remote ? "remote" : "unknown",
    experience: "",
    minYears: 0,
    salary: "",
    url: job.job_apply_link,
    source: "jsearch",
    description: job.job_description ?? "",
  }));
}

export async function searchJobs(query: JobQuery) {
  const sample = searchCatalog(query, SAMPLE_JOBS);
  const live: JobResult[] = [];
  const errors: string[] = [];
  if (process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY) {
    try {
      live.push(...(await searchAdzuna(query)));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Adzuna failed");
    }
  }
  if (process.env.JSEARCH_API_KEY) {
    try {
      live.push(...(await searchJSearch(query)));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "JSearch failed");
    }
  }
  return { sample, live, errors, providers: providerStatus() };
}
