export type FitNiche = {
  title: string;
  aliases: string[];
  industries: string[];
  seniority: string;
  locations: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  companyTypes: string[];
};

export type FitJob = {
  title: string;
  company: string;
  location: string;
  description: string;
};

export type FitDimension = { score: number; note: string };

const SENIORITY: Record<string, number> = {
  intern: 0,
  junior: 1,
  associate: 2,
  mid: 3,
  senior: 4,
  staff: 5,
  principal: 5,
  lead: 5,
  manager: 6,
  head: 7,
  director: 8,
  vp: 9,
  "vice president": 9,
  cxo: 10,
  chief: 10,
};

function tokens(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 2);
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

function seniorityRank(value: string) {
  const lower = value.toLowerCase();
  let best = 4;
  for (const [label, rank] of Object.entries(SENIORITY)) {
    if (lower.includes(label)) best = Math.max(best, rank);
  }
  return best;
}

function coverage(needles: string[], haystack: string) {
  if (needles.length === 0) return 0.6;
  const text = haystack.toLowerCase();
  const hits = needles.filter((needle) => needle && text.includes(needle.toLowerCase()));
  return hits.length / needles.length;
}

export function scoreFit(input: { niche: FitNiche; job: FitJob; skills: string[] }) {
  const { niche, job, skills } = input;
  const blob = `${job.title} ${job.company} ${job.location} ${job.description}`;
  const titleNeedles = [niche.title, ...niche.aliases].flatMap((item) => tokens(item));
  const titleHits = new Set(tokens(job.title));
  const titleScore = titleNeedles.length
    ? clamp(titleNeedles.filter((token) => titleHits.has(token)).length / Math.min(titleNeedles.length, 4))
    : 0.4;

  const skillScore = coverage(skills, blob);
  const keywordScore = coverage(niche.includeKeywords, blob);
  const industryScore = coverage(niche.industries, blob);
  const distance = Math.abs(seniorityRank(niche.seniority) - seniorityRank(`${job.title} ${job.description}`));
  const seniorityScore = clamp(1 - distance / 6);
  const locationBlob = `${job.location} ${job.description}`.toLowerCase();
  const remote = niche.locations.some((loc) => /remote|anywhere/i.test(loc)) && /remote|anywhere/i.test(locationBlob);
  const locationScore =
    niche.locations.length === 0
      ? 0.6
      : remote
        ? 1
        : clamp(
            niche.locations.filter((loc) =>
              loc
                .toLowerCase()
                .split(/[^a-z0-9]+/)
                .filter((part) => part.length > 2)
                .some((part) => locationBlob.includes(part)),
            ).length / niche.locations.length,
          );

  const excluded = niche.excludeKeywords.filter((word) => word && blob.toLowerCase().includes(word.toLowerCase()));
  let score =
    titleScore * 0.22 +
    skillScore * 0.28 +
    keywordScore * 0.18 +
    industryScore * 0.1 +
    seniorityScore * 0.12 +
    locationScore * 0.1;
  if (excluded.length) score *= 0.45;
  const percent = Math.round(score * 100);
  const band = percent >= 80 ? "Strong" : percent >= 65 ? "Partial" : percent >= 50 ? "Moderate" : "Weak";

  const dimensions: Record<string, FitDimension> = {
    function: { score: Math.round(titleScore * 100), note: titleScore > 0.5 ? "Title language overlaps the niche." : "Title is adjacent, not exact." },
    skills: { score: Math.round(skillScore * 100), note: `${Math.round(skillScore * 100)}% of listed skills show up in the description.` },
    keywords: { score: Math.round(keywordScore * 100), note: excluded.length ? `Excluded terms present: ${excluded.join(", ")}.` : "Include-keywords checked against the description." },
    industry: { score: Math.round(industryScore * 100), note: niche.industries.length ? "Industry terms compared with the posting." : "No industry constraint set." },
    seniority: { score: Math.round(seniorityScore * 100), note: distance <= 1 ? "Seniority is close." : "Seniority sits a step away from the target." },
    location: { score: Math.round(locationScore * 100), note: remote ? "Remote matches an open location." : "Location compared with the niche." },
  };

  return { score: percent, band, dimensions, excluded };
}
