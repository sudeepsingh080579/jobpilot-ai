import { prisma } from "@/lib/prisma";
import { emptyResume, resumeToText, type ResumeContent } from "@/lib/resume/types";
import { listPostings, postingDetails, type Ats, type Posting } from "@/lib/hunt/ats";
import { dedupKey, locationDecision, needsInputFor, scoreRole, titleRelevance, type HuntPrefs } from "@/lib/hunt/rules";
import { tailorResume, validateTailored } from "@/lib/hunt/tailor";
import { buildAnswers, hasSalaryAnswer } from "@/lib/hunt/answers";
import { VERIFIED_COMPANIES } from "@/lib/hunt/catalog";

const MAX_DETAILS_PER_COMPANY = 8;
const MIN_TITLE_RELEVANCE = 0.34;

export async function getHuntSettings(userId: string) {
  return (await prisma.huntSettings.findUnique({ where: { userId } })) ?? prisma.huntSettings.create({ data: { userId } });
}

/** First visit: add the verified catalog as the user's employer list (they can disable/remove any). */
export async function ensureSeeded(userId: string) {
  if (await prisma.huntCompany.count({ where: { userId } })) return;
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

export type RunSummary = { runId: string; companies: number; fetched: number; relevant: number; fresh: number; queued: number; skipped: number; errors: string[] };

export async function runHunt(userId: string, trigger: "manual" | "cron" = "manual"): Promise<RunSummary | { error: string }> {
  const [settings, prefs, user, resumes, saved] = await Promise.all([
    getHuntSettings(userId),
    prisma.jobPreferences.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, location: true } }),
    prisma.resume.findMany({ where: { userId }, orderBy: [{ isPrimary: "desc" }, { updatedAt: "desc" }], take: 1 }),
    prisma.savedAnswer.findMany({ where: { userId } }),
  ]);
  const targetRoles = prefs?.targetRoles ?? [];
  if (!targetRoles.length) return { error: "Add at least one target role in onboarding/settings first." };
  const resume = resumes[0];
  if (!resume) return { error: "Upload a resume first; roles are scored against it." };
  const content = parseResume(resume.content);
  const resumeText = resume.rawText || resumeToText(content);
  const resumeSkills = [...content.skills.flatMap((g) => g.items), ...(prefs?.skills ?? [])];
  const huntPrefs: HuntPrefs = { allowedCountries: settings.allowedCountries, allowUsWithSponsorship: settings.allowUsWithSponsorship, needsSponsorship: settings.needsSponsorship, homeCountry: settings.homeCountry };
  const salaryKnown = hasSalaryAnswer({ expectedCtcLakhs: prefs?.expectedCtcLakhs ?? null, saved });

  await ensureSeeded(userId);
  const companies = await prisma.huntCompany.findMany({
    where: { userId, enabled: true },
    orderBy: [{ lastFetchedAt: { sort: "asc", nulls: "first" } }],
    take: Math.min(Math.max(settings.companiesPerRun, 1), 60),
  });
  const run = await prisma.huntRun.create({ data: { userId, trigger, companies: companies.length } });
  const seen = new Set((await prisma.huntJob.findMany({ where: { userId }, select: { key: true } })).map((r) => r.key));
  const errors: string[] = [];
  let fetched = 0, relevant = 0, fresh = 0, queued = 0, skipped = 0;

  await pool(companies, 5, async (co) => {
    let postings: Posting[] = [];
    try {
      postings = await listPostings(co.ats as Ats, co.boardToken);
      await prisma.huntCompany.updateMany({ where: { id: co.id, userId }, data: { lastFetchedAt: new Date(), lastStatus: `ok (${postings.length} open)` } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "fetch failed";
      errors.push(`${co.name}: ${msg}`);
      await prisma.huntCompany.updateMany({ where: { id: co.id, userId }, data: { lastFetchedAt: new Date(), lastStatus: `error: ${msg}` } });
      return;
    }
    fetched += postings.length;
    const shortlisted = postings
      .map((p) => ({ p, rel: titleRelevance(p.title, targetRoles), key: dedupKey(p) }))
      .filter((r) => r.rel >= MIN_TITLE_RELEVANCE)
      .sort((a, b) => b.rel - a.rel);
    relevant += shortlisted.length;
    const novel = shortlisted.filter((r) => !seen.has(r.key)).slice(0, MAX_DETAILS_PER_COMPANY);
    for (const { p, key } of novel) {
      seen.add(key);
      fresh++;
      let description = p.description;
      let questions: string[] = [];
      try {
        const d = await postingDetails(p);
        description = d.description || description;
        questions = d.questions;
      } catch (e) {
        errors.push(`${co.name} / ${p.title}: details ${e instanceof Error ? e.message : "failed"}`);
      }
      const loc = locationDecision(p.location, p.workplace, description, huntPrefs);
      const detail = scoreRole({ title: p.title, description, resumeText, resumeSkills, targetRoles });
      const base = { userId, key, runId: run.id, company: co.name, ats: p.ats, externalId: p.externalId, title: p.title.slice(0, 300), location: p.location.slice(0, 300), url: p.url, score: detail.score, scoreDetail: JSON.stringify(detail) };
      let decision = "skipped";
      let skipReason = "";
      let tailored = "";
      let answers = "[]";
      let needsInput: string[] = [];
      let country = "";
      if (!loc.ok) skipReason = loc.reason;
      else if (detail.score < settings.threshold) { skipReason = `Score ${detail.score} below threshold ${settings.threshold}`; country = loc.country; }
      else {
        country = loc.country;
        const t = tailorResume(content, `${p.title} ${description}`, detail.matched);
        const check = validateTailored(content, t);
        if (!check.ok) { skipReason = `Tailoring guardrail rejected output (${check.violations.map((x) => x.field).join(", ")})`; }
        else {
          decision = "queued";
          tailored = resumeToText(t);
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
      await prisma.huntJob.create({ data: { ...base, userId, country, decision, skipReason, tailored, answers, needsInput } }).catch(() => {});
    }
  });

  await prisma.huntRun.updateMany({ where: { id: run.id, userId }, data: { status: "done", fetched, relevant, fresh, queued, skipped, errors: JSON.stringify(errors.slice(0, 50)), finishedAt: new Date() } });
  return { runId: run.id, companies: companies.length, fetched, relevant, fresh, queued, skipped, errors };
}
