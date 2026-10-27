import { prisma } from "@/lib/prisma";
import { emptyResume, resumeToText, type ResumeContent } from "@/lib/resume/types";
import { isFresh, listPostings, postingDetails, type Ats, type Posting } from "@/lib/hunt/ats";
import { fetchProviderPostings } from "@/lib/hunt/providers";
import { renderAtsText } from "@/lib/resume/enhance";
import { emailMode, sendEmail } from "@/lib/email";
import { dedupKey, locationDecision, needsInputFor, scoreRole, titleRelevance, type HuntPrefs } from "@/lib/hunt/rules";
import { tailorResume, validateTailored } from "@/lib/hunt/tailor";
import { buildAnswers, hasSalaryAnswer } from "@/lib/hunt/answers";
import { VERIFIED_COMPANIES } from "@/lib/hunt/catalog";

const MAX_DETAILS_PER_COMPANY = 10;
const MAX_COMPANIES_PER_RUN = 300;
const CONCURRENCY = 12;
/** Stop starting new companies after this long (Vercel maxDuration is 300 s). */
const DEADLINE_MS = 235_000;
const MIN_TITLE_RELEVANCE = 0.34;

export async function getHuntSettings(userId: string) {
  return (await prisma.huntSettings.findUnique({ where: { userId } })) ?? prisma.huntSettings.create({ data: { userId } });
}

/** First visit: add the verified catalog as the user's employer list (they can disable/remove any). */
export async function ensureSeeded(userId: string) {
  // Always top up: new catalog entries reach existing users too (duplicates are skipped).
  await prisma.huntCompany.createMany({
    data: VERIFIED_COMPANIES.map((c) => ({ userId, name: c.name, ats: c.ats, boardToken: c.token, industry: c.industry, source: "seed" })),
    skipDuplicates: true,
  });
}

function parseResume(raw: string): ResumeContent {
  try {
    return { ...emptyResume(), ...(JSON.parse(raw) as Partial<ResumeContent>) };
  } catch {
    return emptyResume();
  }
}

async function pool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>) {
  const out: R[] = [];
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) {
      const x = items[i++];
      out.push(await fn(x));
    }
  }));
  return out;
}

export type RunSummary = {
  runId: string; companies: number; fetched: number; relevant: number; fresh: number; queued: number; skipped: number;
  stale: number; undated: number; locationSkipped: number; providers: string[]; partial: boolean; errors: string[];
};

/** The resume the hunt scores and tailors from: newest enhanced version, else the primary upload. */
export async function huntResume(userId: string) {
  const [version, resumes] = await Promise.all([
    prisma.resumeVersion.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.resume.findMany({ where: { userId }, orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }], take: 1 }),
  ]);
  if (version) {
    const content = parseResume(version.content);
    return { content, text: renderAtsText(content), label: `Enhanced v${version.version}` };
  }
  const r = resumes[0];
  if (!r) return null;
  const content = parseResume(r.content);
  return { content, text: r.rawText || resumeToText(content), label: "Original upload" };
}

export async function runHunt(userId: string, trigger: "manual" | "cron" = "manual"): Promise<RunSummary | { error: string }> {
  const t0 = Date.now();
  const [settings, prefs, user, resume, saved] = await Promise.all([
    getHuntSettings(userId),
    prisma.jobPreferences.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, location: true } }),
    huntResume(userId),
    prisma.savedAnswer.findMany({ where: { userId } }),
  ]);
  const targetRoles = prefs?.targetRoles ?? [];
  if (!targetRoles.length) return { error: "Add at least one target role first (upload your resume at /start or set roles in onboarding)." };
  if (!resume) return { error: "Upload a resume first; roles are scored against it." };
  const { content, text: resumeText } = resume;
  const resumeSkills = [...content.skills.flatMap((g) => g.items), ...(prefs?.skills ?? [])];
  const days = Math.min(30, Math.max(1, settings.freshnessDays));
  const huntPrefs: HuntPrefs = {
    allowedCountries: settings.allowedCountries, allowUsWithSponsorship: settings.allowUsWithSponsorship, needsSponsorship: settings.needsSponsorship,
    homeCountry: settings.homeCountry, chosenLocations: prefs?.locations ?? [], remoteAbroad: settings.remoteAbroad, hybridAbroad: settings.hybridAbroad,
  };
  const salaryKnown = hasSalaryAnswer({ expectedCtcLakhs: prefs?.expectedCtcLakhs ?? null, saved });

  await ensureSeeded(userId);
  const companies = await prisma.huntCompany.findMany({
    where: { userId, enabled: true },
    orderBy: [{ lastFetchedAt: { sort: "asc", nulls: "first" } }],
    take: Math.min(Math.max(settings.companiesPerRun, 1), MAX_COMPANIES_PER_RUN),
  });
  const run = await prisma.huntRun.create({ data: { userId, trigger, companies: companies.length } });
  const seen = new Set((await prisma.huntJob.findMany({ where: { userId }, select: { key: true } })).map((r) => r.key));
  const errors: string[] = [];
  let fetched = 0, relevant = 0, fresh = 0, queued = 0, skipped = 0, stale = 0, undated = 0, locationSkipped = 0, partial = false;

  /** Score one posting and store it. Shared by ATS boards and aggregator results. */
  async function review(p: Posting, key: string, companyName: string, source: string) {
    let description = p.description;
    let questions: string[] = [];
    let location = p.location;
    let postedAt = p.postedAt ?? null;
    let dateKind = p.dateKind ?? "unknown";
    if (source === "ats") {
      try {
        const d = await postingDetails(p);
        description = d.description || description;
        questions = d.questions;
        if (d.location) location = d.location;
        if (d.postedAt) { postedAt = d.postedAt; dateKind = d.dateKind ?? dateKind; }
      } catch (e) {
        errors.push(`${companyName} / ${p.title}: details ${e instanceof Error ? e.message : "failed"}`);
      }
      if (dateKind !== "unknown" && !isFresh({ postedAt, dateKind }, days)) { stale++; return; }
    }
    fresh++;
    const loc = locationDecision(location, p.workplace, description, huntPrefs);
    const detail = scoreRole({ title: p.title, description, resumeText, resumeSkills, targetRoles });
    const base = { userId, key, runId: run.id, company: companyName, ats: p.ats, externalId: p.externalId, title: p.title.slice(0, 300), location: location.slice(0, 300), url: p.url, score: detail.score, scoreDetail: JSON.stringify(detail), postedAt, dateKind, source };
    let decision = "skipped";
    let skipReason = "";
    let tailored = "";
    let tailoredContent = "{}";
    let answers = "[]";
    let needsInput: string[] = [];
    let country = "";
    if (!loc.ok) { skipReason = loc.reason; locationSkipped++; }
    else if (detail.score < settings.threshold) { skipReason = `Score ${detail.score} below threshold ${settings.threshold}`; country = loc.country; }
    else {
      country = loc.country;
      const t = tailorResume(content, `${p.title} ${description}`, detail.matched);
      const check = validateTailored(content, t);
      if (!check.ok) { skipReason = `Tailoring guardrail rejected output (${check.violations.map((x) => x.field).join(", ")})`; }
      else {
        decision = "queued";
        tailored = renderAtsText(t);
        tailoredContent = JSON.stringify(t);
        answers = JSON.stringify(buildAnswers({
          name: content.name || user?.name || "", email: content.email || user?.email || "", phone: content.phone, location: content.location || user?.location || "", links: content.links,
          noticePeriodDays: prefs?.noticePeriodDays ?? null, currentCtcLakhs: prefs?.currentCtcLakhs ?? null, expectedCtcLakhs: prefs?.expectedCtcLakhs ?? null,
          needsSponsorship: settings.needsSponsorship, homeCountry: settings.homeCountry, jobCountry: country, saved,
        }));
        needsInput = needsInputFor(questions, salaryKnown);
        if (!questions.length) needsInput.push("Form fields not visible via API — review the form before submitting");
      }
    }
    if (decision === "queued") queued++; else skipped++;
    await prisma.huntJob.create({ data: { ...base, userId, country, decision, skipReason, tailored, tailoredContent, answers, needsInput } }).catch(() => {});
  }

  await pool(companies, CONCURRENCY, async (co) => {
    if (Date.now() - t0 > DEADLINE_MS) { partial = true; return; }
    let postings: Posting[] = [];
    try {
      postings = await listPostings(co.ats as Ats, co.boardToken, fetch, { freshnessDays: days });
      await prisma.huntCompany.updateMany({ where: { id: co.id, userId }, data: { lastFetchedAt: new Date(), lastStatus: `ok (${postings.length} open)` } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch failed";
      errors.push(`${co.name}: ${msg}`);
      await prisma.huntCompany.updateMany({ where: { id: co.id, userId }, data: { lastFetchedAt: new Date(), lastStatus: `error: ${msg}` } });
      return;
    }
    fetched += postings.length;
    // 1) freshness: dated and inside the window; undated only if the user opted in
    const inWindow = postings.filter((p) => {
      if (p.dateKind === "unknown" || !p.postedAt) { if (settings.includeUnknownDate) return true; undated++; return false; }
      if (isFresh(p, days)) return true;
      stale++;
      return false;
    });
    // 2) title relevance, 3) not seen before
    const shortlisted = inWindow
      .map((p) => ({ p, rel: titleRelevance(p.title, targetRoles), key: dedupKey(p) }))
      .filter((r) => r.rel >= MIN_TITLE_RELEVANCE)
      .sort((a, b) => b.rel - a.rel);
    relevant += shortlisted.length;
    const novel = shortlisted.filter((r) => !seen.has(r.key)).slice(0, MAX_DETAILS_PER_COMPANY);
    for (const { p, key } of novel) {
      seen.add(key);
      if (Date.now() - t0 > DEADLINE_MS + 40_000) { partial = true; break; }
      await review(p, key, co.name, "ats");
    }
  });

  // Aggregators (Adzuna / JSearch) when keys exist; same freshness, location and scoring rules.
  const providers: string[] = [];
  if (Date.now() - t0 < DEADLINE_MS) {
    const agg = await fetchProviderPostings({ roles: targetRoles, locations: prefs?.locations ?? [], days });
    providers.push(...agg.used);
    errors.push(...agg.errors);
    fetched += agg.postings.length;
    for (const p of agg.postings) {
      const key = dedupKey({ ats: p.ats, board: p.board, externalId: p.externalId, url: p.url });
      if (seen.has(key)) continue;
      if (!isFresh(p, days) && !(settings.includeUnknownDate && p.dateKind === "unknown")) { if (p.dateKind === "unknown") undated++; else stale++; continue; }
      if (titleRelevance(p.title, targetRoles) < MIN_TITLE_RELEVANCE) continue;
      relevant++;
      seen.add(key);
      await review(p, key, p.company ?? "Company", p.ats);
    }
  }

  await prisma.huntRun.updateMany({ where: { id: run.id, userId }, data: { status: partial ? "partial" : "done", fetched, relevant, fresh, queued, skipped, stale, undated, locationSkipped, errors: JSON.stringify(errors.slice(0, 50)), finishedAt: new Date() } });
  const summary: RunSummary = { runId: run.id, companies: companies.length, fetched, relevant, fresh, queued, skipped, stale, undated, locationSkipped, providers, partial, errors };
  await notifyRun(userId, user?.email ?? "", summary, trigger, days).catch(() => {});
  return summary;
}

/** In-app notice always; email too when a mailer is configured (cron runs only, to avoid spamming manual runs). */
async function notifyRun(userId: string, email: string, s: RunSummary, trigger: string, days: number) {
  const title = s.queued ? `Job hunt: ${s.queued} new match${s.queued === 1 ? "" : "es"} ready` : "Job hunt: no new matches this run";
  const body = `${s.companies} companies checked, ${s.fetched} open roles read. ${s.fresh} posted in the last ${days} days were new to you; ${s.queued} scored at or above your threshold and have a tailored resume. ${s.locationSkipped} were outside your locations. Nothing is submitted for you — open the queue to review and apply.`;
  await prisma.userNotice.create({ data: { userId, kind: "hunt", title, body, href: "/hunt" } });
  if (trigger === "cron" && email && emailMode() !== "console") {
    await sendEmail({ to: email, subject: title, text: `${body}\n\nOpen your queue: ${process.env.AUTH_URL || process.env.NEXTAUTH_URL || "https://jobpilot-ai-murex.vercel.app"}/hunt` });
  }
}
