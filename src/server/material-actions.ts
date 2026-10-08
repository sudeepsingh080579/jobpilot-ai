"use server";

import { revalidatePath } from "next/cache";
import { completeJson } from "@/lib/ai";
import { parseJson, stringifyJson } from "@/lib/json";
import type { ResumeInput } from "@/lib/inputs";
import { prisma } from "@/lib/prisma";
import { resumeToText, type ResumeContent } from "@/lib/resume/types";
import { matchKeywords } from "@/lib/scoring/ats";
import { scoreResume } from "@/lib/scoring/resume-score";
import { weekKey } from "@/lib/utils";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

async function ownedResume(id: string, userId: string) {
  return prisma.resume.findFirst({ where: { id, userId } });
}

export async function saveResume(input: ResumeInput) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const content = input.content;
  if (!content.name.trim()) return fail("Add your name before saving.");
  const scored = scoreResume(content);
  if (input.isPrimary) {
    await prisma.resume.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
  }
  const data = {
    title: input.title.trim() || "Untitled resume",
    template: input.template,
    isPrimary: input.isPrimary,
    content: stringifyJson(content),
    rawText: input.rawText ?? resumeToText(content),
    score: scored.score,
    scoreDetail: stringifyJson(scored),
  };
  const resume = input.id
    ? await (async () => {
        const existing = await ownedResume(input.id!, user.id);
        if (!existing) return null;
        return prisma.resume.update({ where: { id: existing.id }, data });
      })()
    : await prisma.resume.create({
        data: {
          ...data,
          userId: user.id,
          isPrimary: input.isPrimary || (await prisma.resume.count({ where: { userId: user.id } })) === 0,
        },
      });
  if (!resume) return fail("Resume not found.");
  revalidatePath("/resumes");
  revalidatePath(`/resumes/${resume.id}`);
  return ok({ id: resume.id, score: scored.score });
}

export async function deleteResume(id: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  await prisma.resume.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/resumes");
  return ok({ id });
}

export async function matchResumeToJob(resumeId: string, jobId: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const resume = await ownedResume(resumeId, user.id);
  const job = await prisma.job.findFirst({ where: { id: jobId, userId: user.id } });
  if (!resume || !job) return fail("Resume or job not found.");
  const content = parseJson<ResumeContent>(resume.content, { name: "" } as ResumeContent);
  const text = `${resume.rawText}\n${resumeToText(content)}`;
  return ok(matchKeywords(text, job.description));
}

export async function tailorResume(resumeId: string, jobId: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const resume = await ownedResume(resumeId, user.id);
  const job = await prisma.job.findFirst({ where: { id: jobId, userId: user.id } });
  if (!resume || !job) return fail("Resume or job not found.");
  const content = parseJson<ResumeContent>(resume.content, {
    name: user.name,
    headline: "",
    location: "",
    email: "",
    phone: "",
    links: [],
    summary: resume.rawText,
    skills: [],
    experience: [],
    education: [],
    certifications: [],
  });
  const ats = matchKeywords(resumeToText(content), job.description);
  const ai = await completeJson<{ summary: string; skillsToAdd: string[]; notes: string; bulletPrefix?: string }>("resume_tailor", {
    name: user.name,
    title: job.title,
    company: job.company,
    summary: content.summary,
    missed: ats.missed,
  });
  const next: ResumeContent = {
    ...content,
    summary: ai.data.summary || content.summary,
    skills: ai.data.skillsToAdd?.length
      ? [...content.skills, { group: `Matched to ${job.company}`, items: ai.data.skillsToAdd }]
      : content.skills,
    experience: content.experience.map((role, index) =>
      index === 0 && role.bullets[0]
        ? { ...role, bullets: [`${ai.data.bulletPrefix ?? ""}${role.bullets[0]}`.trim(), ...role.bullets.slice(1)] }
        : role,
    ),
  };
  const scored = scoreResume(next);
  const created = await prisma.resume.create({
    data: {
      userId: user.id,
      title: `Tailored · ${job.company}`,
      template: resume.template,
      isPrimary: false,
      content: stringifyJson(next),
      rawText: resumeToText(next),
      score: scored.score,
      scoreDetail: stringifyJson({ ...scored, notes: ai.data.notes, before: ats.score }),
    },
  });
  revalidatePath("/resumes");
  return ok({ id: created.id, notes: ai.data.notes, before: ats.score, after: matchKeywords(resumeToText(next), job.description).score });
}

export async function generateLetter(input: { jobId: string; resumeId?: string; template?: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const job = await prisma.job.findFirst({ where: { id: input.jobId, userId: user.id } });
  if (!job) return fail("Choose a saved job first.");
  const resume = input.resumeId
    ? await ownedResume(input.resumeId, user.id)
    : await prisma.resume.findFirst({ where: { userId: user.id, isPrimary: true } });
  const content = resume ? parseJson<ResumeContent>(resume.content, null as unknown as ResumeContent) : null;
  const ai = await completeJson<{ content: string }>("cover_letter", {
    name: user.name,
    title: job.title,
    company: job.company,
    summary: content?.summary ?? user.headline,
  });
  const letter = await prisma.coverLetter.create({
    data: {
      userId: user.id,
      jobId: job.id,
      resumeId: resume?.id,
      title: `${job.company} · ${job.title}`,
      template: input.template || "letterhead",
      content: ai.data.content,
    },
  });
  revalidatePath("/letters");
  return ok({ id: letter.id });
}

export async function saveLetter(input: { id: string; title: string; template: string; content: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const existing = await prisma.coverLetter.findFirst({ where: { id: input.id, userId: user.id } });
  if (!existing) return fail("Letter not found.");
  await prisma.coverLetter.update({
    where: { id: existing.id },
    data: { title: input.title.trim() || existing.title, template: input.template, content: input.content },
  });
  revalidatePath(`/letters/${existing.id}`);
  return ok({ id: existing.id });
}

export async function deleteLetter(id: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  await prisma.coverLetter.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/letters");
  return ok({ id });
}

export async function generatePosts() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const ai = await completeJson<{ posts: { theme: string; content: string }[] }>("linkedin_posts", {
    name: user.name,
    title: user.currentTitle || user.headline,
  });
  const weekOf = weekKey();
  await prisma.linkedInPost.deleteMany({ where: { userId: user.id, weekOf, status: "DRAFT" } });
  await prisma.linkedInPost.createMany({
    data: ai.data.posts.slice(0, 3).map((post) => ({
      userId: user.id,
      theme: post.theme,
      content: post.content,
      weekOf,
      status: "DRAFT",
    })),
  });
  revalidatePath("/presence");
  return ok({ weekOf });
}

export async function savePost(id: string, content: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const post = await prisma.linkedInPost.findFirst({ where: { id, userId: user.id } });
  if (!post) return fail("Post not found.");
  await prisma.linkedInPost.update({ where: { id }, data: { content } });
  revalidatePath("/presence");
  return ok({ id });
}

export async function rewriteProfile(pastedProfile: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (pastedProfile.trim().length < 40) return fail("Paste a headline and About section, at least a short paragraph.");
  const ai = await completeJson<{ headline: string; about: string }>("linkedin_profile", {
    name: user.name,
    title: user.currentTitle || user.headline,
    pasted: pastedProfile,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pastedProfile,
      headlineSuggestion: ai.data.headline,
      aboutSuggestion: ai.data.about,
    },
  });
  revalidatePath("/presence");
  return ok(ai.data);
}

export async function researchCompany(companyId: string, notes: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const company = await prisma.targetCompany.findFirst({ where: { id: companyId, userId: user.id } });
  if (!company) return fail("Company not found.");
  const ai = await completeJson<{ problems: { title: string; detail: string }[] }>("company_problems", {
    company: company.name,
    notes: notes || company.notes,
    industry: company.industry,
  });
  await prisma.targetCompany.update({
    where: { id: company.id },
    data: { problems: stringifyJson(ai.data.problems), notes: notes || company.notes },
  });
  revalidatePath("/companies");
  revalidatePath("/pitch");
  return ok(ai.data.problems);
}

export async function createDeck(input: { companyId?: string; companyName: string; problem: string; proof: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.problem.trim()) return fail("Pick a problem before generating slides.");
  const ai = await completeJson<{ slides: { kicker: string; title: string; body: string; bullets: string[] }[] }>("pitch_deck", {
    name: user.name,
    company: input.companyName,
    problem: input.problem,
    proof: input.proof,
    title: user.currentTitle,
  });
  const slides = ai.data.slides.map((slide, index) => ({ ...slide, id: `s${index + 1}` }));
  const deck = await prisma.pitchDeck.create({
    data: {
      userId: user.id,
      companyId: input.companyId,
      companyName: input.companyName,
      problem: input.problem,
      slides: stringifyJson(slides),
    },
  });
  revalidatePath("/pitch");
  return ok({ id: deck.id });
}

export async function reviseSlide(input: { deckId: string; slideId: string; instruction: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const deck = await prisma.pitchDeck.findFirst({ where: { id: input.deckId, userId: user.id } });
  if (!deck) return fail("Deck not found.");
  const slides = parseJson<{ id: string; kicker: string; title: string; body: string; bullets: string[] }[]>(deck.slides, []);
  const slide = slides.find((item) => item.id === input.slideId);
  if (!slide) return fail("Slide not found.");
  const ai = await completeJson<{ title: string; body: string; bullets: string[] }>("pitch_revise", {
    instruction: input.instruction,
    title: slide.title,
    body: slide.body,
    bullets: slide.bullets,
  });
  const next = slides.map((item) =>
    item.id === slide.id ? { ...item, title: ai.data.title || item.title, body: ai.data.body || item.body, bullets: ai.data.bullets?.length ? ai.data.bullets : item.bullets } : item,
  );
  await prisma.pitchDeck.update({ where: { id: deck.id }, data: { slides: stringifyJson(next) } });
  revalidatePath(`/pitch/${deck.id}`);
  return ok({ slides: next });
}

export async function saveDeckSlides(deckId: string, slides: { id: string; kicker: string; title: string; body: string; bullets: string[] }[]) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const deck = await prisma.pitchDeck.findFirst({ where: { id: deckId, userId: user.id } });
  if (!deck) return fail("Deck not found.");
  await prisma.pitchDeck.update({ where: { id: deck.id }, data: { slides: stringifyJson(slides) } });
  revalidatePath(`/pitch/${deck.id}`);
  return ok({ id: deck.id });
}
