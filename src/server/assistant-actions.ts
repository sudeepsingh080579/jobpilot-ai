"use server";

import { revalidatePath } from "next/cache";
import { aiGate, meteredAi } from "@/server/billing";
import { routeIntent } from "@/lib/assistant/route";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { resumeToText, type ResumeContent } from "@/lib/resume/types";
import { matchKeywords } from "@/lib/scoring/ats";
import { scoreFit } from "@/lib/scoring/fit";
import { buildWeeklyPlan } from "@/lib/scoring/weekly";
import { weekKey } from "@/lib/utils";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

const QUICK: Record<string, { label: string; href: string; module: string }> = {
  cover: { label: "Cover letter", href: "/letters", module: "letters" },
  fit: { label: "Fit", href: "/strategy", module: "strategy" },
  ats: { label: "ATS check", href: "/resumes", module: "resumes" },
  tailor: { label: "Tailor resume", href: "/resumes", module: "resumes" },
  interview: { label: "Practice interview", href: "/interview", module: "interview" },
};

export async function sendAssistant(input: { message: string; jobId?: string; intent?: string; variant?: number }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "chat");
  if (gate) return gate;
  const message = input.message.trim();
  if (!message && !input.intent) return fail("Write a message first.");
  const niche = await prisma.niche.findFirst({ where: { userId: user.id, isPrimary: true } });
  const job = input.jobId ? await prisma.job.findFirst({ where: { id: input.jobId, userId: user.id } }) : null;
  const resume = await prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true } });
  const route = input.intent && QUICK[input.intent] ? QUICK[input.intent] : routeIntent(message || input.intent || "");
  const display = message || `Quick action: ${route.label}${job ? ` for ${job.title} at ${job.company}` : ""}`;

  await prisma.chatMessage.create({
    data: { userId: user.id, role: "user", content: display, module: route.module, jobId: job?.id },
  });

  let detail = "";
  let href = route.href;
  try {
    if (input.intent === "cover" && job) {
      const ai = await meteredAi<{ content: string }>(user, "cover_letter", {
        name: user.name,
        title: job.title,
        company: job.company,
        summary: resume ? parseJson<ResumeContent>(resume.content, { summary: "" } as ResumeContent).summary : user.headline,
      });
      const letter = await prisma.coverLetter.create({
        data: { userId: user.id, jobId: job.id, resumeId: resume?.id, title: `${job.company} · ${job.title}`, content: ai.data.content, template: "letterhead" },
      });
      href = `/letters/${letter.id}`;
      detail = `I drafted a cover letter for ${job.title} at ${job.company}. Open it, edit the middle, then export a PDF.`;
    } else if (input.intent === "ats" && job && resume) {
      const content = parseJson<ResumeContent>(resume.content, { summary: "" } as ResumeContent);
      const match = matchKeywords(`${resume.rawText}\n${resumeToText(content)}`, job.description);
      href = `/resumes/${resume.id}`;
      detail = `ATS match against ${job.company} is ${match.score}. Matched: ${match.matched.slice(0, 8).join(", ") || "none"}. Missing: ${match.missed.slice(0, 8).join(", ") || "none"}.`;
    } else if (input.intent === "tailor" && job && resume) {
      href = `/resumes/${resume.id}`;
      detail = `Open ${resume.title} and run Tailor for ${job.company}. I kept that as an explicit step so you can see the before and after.`;
    } else if (input.intent === "fit" && job && niche) {
      const skills = await prisma.skill.findMany({ where: { userId: user.id } });
      const fit = scoreFit({
        niche: {
          title: niche.title,
          aliases: parseJson(niche.aliases, []),
          industries: parseJson(niche.industries, []),
          seniority: niche.seniority,
          locations: parseJson(niche.locations, []),
          includeKeywords: parseJson(niche.includeKeywords, []),
          excludeKeywords: parseJson(niche.excludeKeywords, []),
          companyTypes: parseJson(niche.companyTypes, []),
        },
        job,
        skills: skills.map((skill) => skill.name),
      });
      const narrative = await meteredAi<{ narrative: string }>(user, "fit_narrative", { band: fit.band, jobTitle: job.title, company: job.company, skills: skills.map((s) => s.name) });
      href = `/tracker/${job.id}`;
      detail = `${fit.band} fit, ${fit.score}/100. ${narrative.data.narrative}`;
    } else if (input.intent === "interview" && job) {
      href = `/interview?job=${job.id}`;
      detail = `Start a five-question practice round for ${job.title}. Type or use the mic. I will score content, fillers, and pace.`;
    } else {
      const jobs = await prisma.job.groupBy({ by: ["status"], where: { userId: user.id, archived: false }, _count: true });
      const count = (status: string) => jobs.find((row) => row.status === status)?._count ?? 0;
      const posts = await prisma.linkedInPost.count({ where: { userId: user.id, weekOf: weekKey() } });
      const plan = buildWeeklyPlan({
        saved: count("SAVED"),
        applied: count("APPLIED"),
        screening: count("SCREENING"),
        interviewing: count("INTERVIEWING"),
        offers: count("OFFER"),
        staleFollowups: 0,
        outreachDue: await prisma.contact.count({ where: { userId: user.id } }),
        resumeScore: resume?.score ?? null,
        hasPrimaryResume: Boolean(resume),
        postsThisWeek: posts,
      });
      const ai = await meteredAi<{ message: string }>(user, "chat", {
        name: user.name,
        niche: niche?.title ?? "your niche",
        message: display,
        nextLabel: plan[0]?.title ?? route.label,
        variant: input.variant ?? 0,
      });
      href = plan[0]?.href ?? route.href;
      detail = `${ai.data.message}\n\nNext: ${plan[0]?.title ?? route.label}.`;
    }
  } catch (error) {
    detail = error instanceof Error ? error.message : "I could not complete that.";
  }

  const saved = await prisma.chatMessage.create({
    data: { userId: user.id, role: "assistant", content: detail, module: route.module, jobId: job?.id },
  });
  revalidatePath("/assistant");
  return ok({ id: saved.id, content: detail, href, label: route.label });
}

export async function rateMessage(id: string, rating: number) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (rating !== 1 && rating !== -1) return fail("Rating must be up or down.");
  const message = await prisma.chatMessage.findFirst({ where: { id, userId: user.id, role: "assistant" } });
  if (!message) return fail("Message not found.");
  await prisma.chatMessage.update({ where: { id }, data: { rating } });
  return ok({ id });
}
