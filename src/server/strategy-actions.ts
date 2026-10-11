"use server";

import { revalidatePath } from "next/cache";
import { aiGate, meteredAi } from "@/server/billing";
import { parseJson, stringifyJson } from "@/lib/json";
import type { NicheInput } from "@/lib/inputs";
import { prisma } from "@/lib/prisma";
import { emptyResume, type ResumeContent } from "@/lib/resume/types";
import { scoreFit } from "@/lib/scoring/fit";
import { scoreResume } from "@/lib/scoring/resume-score";
import { splitList } from "@/lib/utils";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

function asJsonList(value: string) {
  return stringifyJson(splitList(value));
}

function nicheData(input: NicheInput) {
  return {
    name: input.name.trim() || input.title.trim(),
    title: input.title.trim(),
    aliases: asJsonList(input.aliases),
    industries: asJsonList(input.industries),
    seniority: input.seniority.trim(),
    roleCategory: input.roleCategory.trim(),
    functionName: input.functionName.trim(),
    companyTypes: asJsonList(input.companyTypes),
    locations: asJsonList(input.locations),
    workModes: asJsonList(input.workModes),
    targetCompanies: asJsonList(input.targetCompanies),
    includeKeywords: asJsonList(input.includeKeywords),
    excludeKeywords: asJsonList(input.excludeKeywords),
    why: input.why.trim(),
    payBenchmark: input.payBenchmark.trim(),
    isPrimary: input.isPrimary,
  };
}

export async function saveNiche(input: NicheInput) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.title.trim()) return fail("A target title is required.");
  if (input.title.trim().length > 80) return fail("Keep the target title under 80 characters.");
  if (input.isPrimary) {
    await prisma.niche.updateMany({ where: { userId: user.id }, data: { isPrimary: false } });
  }
  const data = nicheData(input);
  if (input.id) {
    const existing = await prisma.niche.findFirst({ where: { id: input.id, userId: user.id } });
    if (!existing) return fail("Niche not found.");
    const niche = await prisma.niche.update({ where: { id: existing.id }, data });
    revalidatePath("/strategy");
    return ok({ id: niche.id });
  }
  const count = await prisma.niche.count({ where: { userId: user.id } });
  const niche = await prisma.niche.create({
    data: { ...data, userId: user.id, isPrimary: input.isPrimary || count === 0 },
  });
  revalidatePath("/strategy");
  return ok({ id: niche.id });
}

export async function suggestNiches() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "niche_suggest");
  if (gate) return gate;
  const result = await meteredAi<{ niches: { name: string; title: string; aliases: string[]; industries: string[]; seniority: string; companyTypes: string[]; locations: string[]; includeKeywords: string[]; excludeKeywords: string[]; why: string; payBenchmark: string }[] }>(user, "niche_suggest", {
    name: user.name,
    title: user.currentTitle,
    location: user.location,
    seniority: user.seniority,
  });
  return ok(result.data.niches);
}

export async function acceptNicheSuggestion(suggestion: {
  name: string;
  title: string;
  aliases: string[];
  industries: string[];
  seniority: string;
  companyTypes: string[];
  locations: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  why: string;
  payBenchmark: string;
}) {
  return saveNiche({
    name: suggestion.name,
    title: suggestion.title,
    aliases: suggestion.aliases.join(", "),
    industries: suggestion.industries.join(", "),
    seniority: suggestion.seniority,
    roleCategory: "Leadership",
    functionName: "Platform",
    companyTypes: suggestion.companyTypes.join(", "),
    locations: suggestion.locations.join(", "),
    workModes: "remote, hybrid",
    targetCompanies: "",
    includeKeywords: suggestion.includeKeywords.join(", "),
    excludeKeywords: suggestion.excludeKeywords.join(", "),
    why: suggestion.why,
    payBenchmark: suggestion.payBenchmark,
    isPrimary: true,
  });
}

export async function scoreSavedJobs() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "fit_narrative");
  if (gate) return gate;
  const niche = await prisma.niche.findFirst({ where: { userId: user.id, isPrimary: true } });
  if (!niche) return fail("Save a primary niche before scoring fit.");
  const skills = await prisma.skill.findMany({ where: { userId: user.id } });
  const jobs = await prisma.job.findMany({ where: { userId: user.id, archived: false } });
  const nicheInput = {
    title: niche.title,
    aliases: parseJson<string[]>(niche.aliases, []),
    industries: parseJson<string[]>(niche.industries, []),
    seniority: niche.seniority,
    locations: parseJson<string[]>(niche.locations, []),
    includeKeywords: parseJson<string[]>(niche.includeKeywords, []),
    excludeKeywords: parseJson<string[]>(niche.excludeKeywords, []),
    companyTypes: parseJson<string[]>(niche.companyTypes, []),
  };
  for (const job of jobs) {
    const fit = scoreFit({
      niche: nicheInput,
      job: { title: job.title, company: job.company, location: job.location, description: job.description },
      skills: skills.map((skill) => skill.name),
    });
    const narrative = await meteredAi<{ narrative: string }>(user, "fit_narrative", {
      band: fit.band,
      jobTitle: job.title,
      company: job.company,
      skills: skills.map((skill) => skill.name),
    }).catch(() => ({ data: { narrative: "" } }));
    await prisma.job.update({
      where: { id: job.id },
      data: { fitScore: fit.score, fitBand: fit.band, fitDetail: stringifyJson({ ...fit, narrative: narrative.data.narrative }) },
    });
  }
  revalidatePath("/strategy");
  revalidatePath("/tracker");
  return ok({ count: jobs.length });
}

export async function refreshSkillMap() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "skill_map");
  if (gate) return gate;
  const jobs = await prisma.job.findMany({ where: { userId: user.id }, take: 6 });
  const result = await meteredAi<{ skills: { name: string; category: string; level: number; variants: string[] }[] }>(user, "skill_map", {
    name: user.name,
    descriptions: jobs.map((job) => job.description).join("\n").slice(0, 4000),
  });
  await prisma.skill.deleteMany({ where: { userId: user.id, source: "map" } });
  await prisma.skill.createMany({
    data: result.data.skills.map((skill) => ({
      userId: user.id,
      name: skill.name,
      category: skill.category,
      level: skill.level,
      variants: stringifyJson(skill.variants ?? []),
      source: "map",
    })),
  });
  revalidatePath("/strategy/skills");
  return ok({ count: result.data.skills.length });
}

export async function buildSwot() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "swot");
  if (gate) return gate;
  const jobs = await prisma.job.count({ where: { userId: user.id } });
  if (jobs < 1) return fail("Save at least one job before building a SWOT. Five makes it sharper.");
  const result = await meteredAi<{ strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[]; actions: string[] }>(user, "swot", {
    name: user.name,
    title: user.currentTitle,
    jobs,
  });
  await prisma.swotReport.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      strengths: stringifyJson(result.data.strengths),
      weaknesses: stringifyJson(result.data.weaknesses),
      opportunities: stringifyJson(result.data.opportunities),
      threats: stringifyJson(result.data.threats),
      actions: stringifyJson(result.data.actions),
    },
    update: {
      strengths: stringifyJson(result.data.strengths),
      weaknesses: stringifyJson(result.data.weaknesses),
      opportunities: stringifyJson(result.data.opportunities),
      threats: stringifyJson(result.data.threats),
      actions: stringifyJson(result.data.actions),
    },
  });
  revalidatePath("/strategy/swot");
  return ok({ ready: true });
}

export async function saveCar(input: { id?: string; company: string; role: string; challenge: string; action: string; result: string; skills: string; resumeBullet: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  if (!input.challenge.trim() || !input.action.trim() || !input.result.trim()) return fail("Challenge, action, and result are all required.");
  const data = {
    company: input.company.trim(),
    role: input.role.trim(),
    challenge: input.challenge.trim(),
    action: input.action.trim(),
    result: input.result.trim(),
    skills: asJsonList(input.skills),
    resumeBullet: input.resumeBullet.trim(),
  };
  if (input.id) {
    const existing = await prisma.carStatement.findFirst({ where: { id: input.id, userId: user.id } });
    if (!existing) return fail("Note not found.");
    const row = await prisma.carStatement.update({ where: { id: existing.id }, data });
    revalidatePath("/strategy/car");
    return ok({ id: row.id });
  }
  const row = await prisma.carStatement.create({ data: { ...data, userId: user.id } });
  revalidatePath("/strategy/car");
  return ok({ id: row.id });
}

export async function suggestCar(company: string, role: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "car_scenarios");
  if (gate) return gate;
  const result = await meteredAi<{ scenarios: { challenge: string; action: string; result: string; bullet: string }[] }>(user, "car_scenarios", {
    company,
    role,
    name: user.name,
  });
  return ok(result.data.scenarios);
}

export async function deleteCar(id: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  await prisma.carStatement.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/strategy/car");
  return ok({ id });
}

export async function masterResumeFromCar() {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "resume_from_car");
  if (gate) return gate;
  const cars = await prisma.carStatement.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (cars.length === 0) return fail("Add at least one Challenge-Action-Result note first.");
  const summary = await meteredAi<{ summary: string }>(user, "resume_from_car", {
    name: user.name,
    title: user.currentTitle || user.headline,
    cars: cars.map((car) => ({ company: car.company, role: car.role, bullet: car.resumeBullet || `${car.action} ${car.result}` })),
  });
  const grouped = new Map<string, ResumeContent["experience"][number]>();
  for (const car of cars) {
    const key = `${car.company}::${car.role}`;
    const existing = grouped.get(key) ?? {
      company: car.company,
      title: car.role,
      location: user.location,
      start: "",
      end: "",
      bullets: [],
    };
    const bullet = car.resumeBullet.trim() || `${car.action.trim()} ${car.result.trim()}`.trim();
    existing.bullets.push(bullet);
    grouped.set(key, existing);
  }
  const skills = await prisma.skill.findMany({ where: { userId: user.id } });
  const content: ResumeContent = {
    ...emptyResume(),
    name: user.name,
    headline: user.headline || user.currentTitle,
    location: user.location,
    email: user.email,
    summary: summary.data.summary,
    experience: [...grouped.values()],
    skills: skills.length ? [{ group: "Skills", items: skills.map((skill) => skill.name) }] : [],
  };
  const scored = scoreResume(content);
  const resume = await prisma.resume.create({
    data: {
      userId: user.id,
      title: "Master resume from experience notes",
      template: "ledger",
      isPrimary: false,
      content: stringifyJson(content),
      rawText: content.summary,
      score: scored.score,
      scoreDetail: stringifyJson(scored),
    },
  });
  revalidatePath("/resumes");
  return ok({ id: resume.id });
}
