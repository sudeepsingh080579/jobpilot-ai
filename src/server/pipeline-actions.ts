"use server";

import { revalidatePath } from "next/cache";
import { aiGate, meteredAi } from "@/server/billing";
import { htmlToText } from "@/lib/resume/parse";
import { extractKeywords } from "@/lib/scoring/ats";
import { searchJobs } from "@/lib/jobs/providers";
import type { JobQuery, JobResult } from "@/lib/jobs/catalog";
import { OUTREACH_STEPS, type OutreachStepId } from "@/lib/domain";
import { fillTemplate } from "@/lib/outreach/templates";
import { stringifyJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

const STATUSES = new Set(["SAVED", "APPLIED", "SCREENING", "INTERVIEWING", "OFFER", "REJECTED"]);
const COMPANY_STATUSES = new Set(["RESEARCHING", "WARM", "OUTREACH", "CONVERSATION", "PARKED"]);

export async function searchMarket(query: JobQuery) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  try {
    const result = await searchJobs(query);
    return ok(result);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Search failed");
  }
}

async function createJob(userId: string, job: Partial<JobResult> & { title: string; company: string; description: string }, nicheId?: string | null) {
  return prisma.job.create({
    data: {
      userId,
      nicheId: nicheId ?? undefined,
      title: job.title,
      company: job.company,
      location: job.location ?? "",
      workMode: job.workMode ?? "",
      experience: job.experience ?? "",
      salary: job.salary ?? "",
      url: job.url ?? "",
      source: job.source ?? "manual",
      description: job.description,
      keywords: stringifyJson(extractKeywords(job.description)),
      status: "SAVED",
    },
  });
}

export async function saveSearchedJob(job: JobResult) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const duplicate = await prisma.job.findFirst({
    where: { userId: user.id, title: job.title, company: job.company },
  });
  if (duplicate) return ok({ id: duplicate.id, existing: true });
  const niche = await prisma.niche.findFirst({ where: { userId: user.id, isPrimary: true } });
  const created = await createJob(user.id, job, niche?.id);
  revalidatePath("/tracker");
  revalidatePath("/search");
  return ok({ id: created.id, existing: false });
}

export async function addManualJob(input: { title: string; company: string; location: string; workMode: string; url: string; description: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.title.trim() || !input.company.trim()) return fail("Title and company are required.");
  let description = input.description.trim();
  if (!description && input.url.trim()) {
    try {
      const url = new URL(input.url.trim());
      if (!["http:", "https:"].includes(url.protocol)) return fail("Only http(s) links can be read.");
      const response = await fetch(url, {
        headers: { "User-Agent": "JobPilotAI/0.1 (single URL pasted by the signed-in user)" },
        signal: AbortSignal.timeout(8000),
        redirect: "follow",
      });
      const type = response.headers.get("content-type") ?? "";
      if (!response.ok || (!type.includes("text") && !type.includes("html") && !type.includes("json"))) {
        return fail("That page did not return readable text. Paste the description instead.");
      }
      description = htmlToText(await response.text()).slice(0, 20000);
      if (description.length < 80) return fail("Could not read a description from that page. Paste the text instead.");
    } catch {
      return fail("Could not open that URL. Paste the description instead.");
    }
  }
  if (description.length < 40) return fail("Paste the job description, or a URL that contains it.");
  const niche = await prisma.niche.findFirst({ where: { userId: user.id, isPrimary: true } });
  const created = await createJob(
    user.id,
    {
      title: input.title.trim(),
      company: input.company.trim(),
      location: input.location.trim(),
      workMode: input.workMode,
      url: input.url.trim(),
      description,
      source: input.url ? "pasted-url" : "manual",
    },
    niche?.id,
  );
  revalidatePath("/tracker");
  return ok({ id: created.id });
}

export async function updateJob(input: { id: string; status?: string; notes?: string; archived?: boolean }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const job = await prisma.job.findFirst({ where: { id: input.id, userId: user.id } });
  if (!job) return fail("Job not found.");
  if (input.status && !STATUSES.has(input.status)) return fail("Unknown stage.");
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: input.status ?? job.status,
      notes: input.notes ?? job.notes,
      archived: input.archived ?? job.archived,
      appliedAt: input.status === "APPLIED" && !job.appliedAt ? new Date() : job.appliedAt,
    },
  });
  revalidatePath("/tracker");
  revalidatePath(`/tracker/${job.id}`);
  revalidatePath("/dashboard");
  return ok({ id: job.id });
}

export async function draftForStage(jobId: string, kind: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "stage_draft");
  if (gate) return gate;
  const job = await prisma.job.findFirst({ where: { id: jobId, userId: user.id } });
  if (!job) return fail("Job not found.");
  const ai = await meteredAi<{ content: string }>(user, "stage_draft", {
    kind,
    name: user.name,
    title: job.title,
    company: job.company,
  });
  const draft = await prisma.stageDraft.create({ data: { jobId: job.id, kind, content: ai.data.content } });
  revalidatePath(`/tracker/${job.id}`);
  return ok({ id: draft.id, content: draft.content });
}

export async function saveCompany(input: { id?: string; name: string; industry: string; website: string; location: string; notes: string; status?: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.name.trim()) return fail("Company name is required.");
  const status = input.status && COMPANY_STATUSES.has(input.status) ? input.status : "RESEARCHING";
  if (input.id) {
    const existing = await prisma.targetCompany.findFirst({ where: { id: input.id, userId: user.id } });
    if (!existing) return fail("Company not found.");
    await prisma.targetCompany.update({
      where: { id: existing.id },
      data: { name: input.name.trim(), industry: input.industry, website: input.website, location: input.location, notes: input.notes, status },
    });
    revalidatePath("/companies");
    return ok({ id: existing.id });
  }
  const created = await prisma.targetCompany.create({
    data: { userId: user.id, name: input.name.trim(), industry: input.industry, website: input.website, location: input.location, notes: input.notes, status },
  });
  revalidatePath("/companies");
  return ok({ id: created.id });
}

export async function saveContact(input: { id?: string; name: string; title: string; email: string; linkedin: string; type: string; companyId?: string; jobId?: string; notes: string; tags: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.name.trim()) return fail("Name is required.");
  const data = {
    name: input.name.trim(),
    title: input.title.trim(),
    email: input.email.trim(),
    linkedin: input.linkedin.trim(),
    type: input.type || "POTENTIAL_REFERRER",
    companyId: input.companyId || null,
    jobId: input.jobId || null,
    notes: input.notes.trim(),
    tags: stringifyJson(input.tags.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 4)),
  };
  if (input.id) {
    const existing = await prisma.contact.findFirst({ where: { id: input.id, userId: user.id } });
    if (!existing) return fail("Contact not found.");
    await prisma.contact.update({ where: { id: existing.id }, data });
    revalidatePath("/network");
    return ok({ id: existing.id });
  }
  const created = await prisma.contact.create({ data: { ...data, userId: user.id } });
  revalidatePath("/network");
  return ok({ id: created.id });
}

export async function draftOutreach(contactId: string, step: OutreachStepId) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "outreach_draft");
  if (gate) return gate;
  if (!OUTREACH_STEPS.some((item) => item.id === step)) return fail("Unknown step.");
  const contact = await prisma.contact.findFirst({ where: { id: contactId, userId: user.id }, include: { company: true, job: true } });
  if (!contact) return fail("Contact not found.");
  const template = await prisma.outreachTemplate.findUnique({ where: { userId_step: { userId: user.id, step } } });
  const firstName = contact.name.split(" ")[0] ?? contact.name;
  const filled = fillTemplate(template?.body ?? "Hi {{firstName}} — a note about {{company}}.", {
    firstName,
    company: contact.company?.name ?? contact.job?.company ?? "your company",
    role: user.currentTitle || user.headline || "senior platform leader",
    myName: user.name,
    hook: "the platform team is still the path every squad waits on",
  });
  const ai = await meteredAi<{ body: string }>(user, "outreach_draft", {
    filled,
    name: user.name,
    title: user.currentTitle,
    company: contact.company?.name ?? "",
  });
  const existing = await prisma.outreachMessage.findFirst({ where: { contactId: contact.id, step } });
  const message = existing
    ? await prisma.outreachMessage.update({ where: { id: existing.id }, data: { body: ai.data.body, status: "DRAFT" } })
    : await prisma.outreachMessage.create({ data: { contactId: contact.id, step, body: ai.data.body, status: "DRAFT" } });
  revalidatePath(`/network/${contact.id}`);
  return ok({ id: message.id, body: message.body });
}

export async function markDraftCopied(messageId: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const message = await prisma.outreachMessage.findFirst({ where: { id: messageId, contact: { userId: user.id } } });
  if (!message) return fail("Draft not found.");
  await prisma.outreachMessage.update({ where: { id: message.id }, data: { status: "COPIED" } });
  revalidatePath("/network");
  return ok({ id: message.id });
}

export async function saveTemplate(step: string, body: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!OUTREACH_STEPS.some((item) => item.id === step)) return fail("Unknown step.");
  await prisma.outreachTemplate.upsert({
    where: { userId_step: { userId: user.id, step } },
    create: { userId: user.id, step, name: step, body },
    update: { body },
  });
  revalidatePath("/network");
  return ok({ step });
}
