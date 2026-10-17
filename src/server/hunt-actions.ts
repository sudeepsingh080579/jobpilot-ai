"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { parseCompanyCsv, VERIFIED_COMPANIES } from "@/lib/hunt/catalog";
import { verifyBoard, type Ats } from "@/lib/hunt/ats";
import { actionUser } from "@/server/session";
import { getHuntSettings, runHunt } from "@/server/hunt-store";

const done = () => revalidatePath("/hunt");

export async function runHuntAction() {
  const user = await actionUser();
  if (!user) return { ok: false as const, error: "Please sign in again." };
  const rl = await rateLimit(`hunt:${user.id}`, 3, 10 * 60 * 1000);
  if (!rl.ok) return { ok: false as const, error: "You can start up to 3 runs every 10 minutes." };
  const r = await runHunt(user.id, "manual");
  done();
  return "error" in r ? { ok: false as const, error: r.error } : { ok: true as const, summary: r };
}

export async function markJobAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  const decision = String(form.get("decision"));
  if (!["applied", "dismissed"].includes(decision)) return;
  await prisma.huntJob.updateMany({ where: { id: String(form.get("id")), userId: user.id }, data: { decision, appliedAt: decision === "applied" ? new Date() : null } });
  done();
}

export async function saveHuntSettingsAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  await getHuntSettings(user.id);
  const countries = String(form.get("allowedCountries") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const threshold = Math.min(100, Math.max(0, Number(form.get("threshold")) || 70));
  await prisma.huntSettings.update({
    where: { userId: user.id },
    data: {
      threshold,
      allowedCountries: countries.length ? countries : undefined,
      needsSponsorship: form.get("needsSponsorship") === "on",
      allowUsWithSponsorship: form.get("allowUsWithSponsorship") === "on",
      homeCountry: String(form.get("homeCountry") ?? "India").trim().slice(0, 60) || "India",
      companiesPerRun: Math.min(60, Math.max(1, Number(form.get("companiesPerRun")) || 25)),
      autoRun: form.get("autoRun") === "on",
    },
  });
  done();
}

export async function toggleCompanyAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  const id = String(form.get("id"));
  const enabled = form.get("enabled") === "1";
  await prisma.huntCompany.updateMany({ where: { id, userId: user.id }, data: { enabled } });
  done();
}

async function addCompanies(userId: string, rows: { name: string; ats: Ats; token: string; industry: string }[], source: string) {
  const results: string[] = [];
  for (const r of rows.slice(0, 50)) {
    const v = await verifyBoard(r.ats, r.token);
    if (!v.ok) { results.push(`${r.name}: board not reachable (HTTP ${v.status}) — not added`); continue; }
    await prisma.huntCompany.upsert({
      where: { userId_ats_boardToken: { userId, ats: r.ats, boardToken: r.token } },
      create: { userId, name: r.name, ats: r.ats, boardToken: r.token, industry: r.industry, source, lastStatus: "verified" },
      update: { enabled: true, name: r.name },
    });
    results.push(`${r.name}: added`);
  }
  return results;
}

export async function addCompanyAction(_prev: unknown, form: FormData) {
  const user = await actionUser();
  if (!user) return { results: ["Please sign in again."] };
  const csv = String(form.get("csv") ?? "");
  const single = String(form.get("name") ?? "").trim();
  const rows = csv.trim()
    ? parseCompanyCsv(csv)
    : parseCompanyCsv(`${single},${String(form.get("ats") ?? "")},${String(form.get("token") ?? "").trim()},${String(form.get("industry") ?? "")}`);
  const results = [...rows.errors, ...(await addCompanies(user.id, rows.rows, csv.trim() ? "csv" : "user"))];
  done();
  return { results };
}

export async function addSuggestionAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  const c = VERIFIED_COMPANIES.find((x) => x.token === String(form.get("token")) && x.ats === String(form.get("ats")));
  if (c) await addCompanies(user.id, [{ name: c.name, ats: c.ats, token: c.token, industry: c.industry }], "suggestion");
  done();
}

export async function saveAnswerAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  const question = String(form.get("question") ?? "").trim().slice(0, 300);
  const answer = String(form.get("answer") ?? "").trim().slice(0, 2000);
  if (question && answer) await prisma.savedAnswer.create({ data: { userId: user.id, question, answer } });
  done();
}

export async function deleteAnswerAction(form: FormData) {
  const user = await actionUser();
  if (!user) return;
  await prisma.savedAnswer.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  done();
}
