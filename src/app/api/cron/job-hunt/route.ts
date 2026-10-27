import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { runHunt } from "@/server/hunt-store";
import { isDue } from "@/lib/hunt/schedule";

export const runtime = "nodejs";
export const maxDuration = 300;

const BUDGET_MS = 200_000;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(request.headers.get("authorization") ?? "");
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Vercel Cron dispatcher. vercel.json fires this once per UTC hour (24 daily entries — the Hobby
 * plan allows one run per cron entry per day, ±59 min). Each firing runs the users whose chosen
 * local time has passed and who have not run today. Requires `Authorization: Bearer CRON_SECRET`.
 */
export async function GET(request: Request) {
  if (!authorised(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const t0 = Date.now();
  const now = new Date();
  const users = await prisma.huntSettings.findMany({
    where: { autoRun: true },
    select: { userId: true, timezone: true, autoRunHour: true, autoRunMinute: true, lastAutoRunAt: true },
    orderBy: { lastAutoRunAt: { sort: "asc", nulls: "first" } },
    take: 200,
  });
  const due = users.filter((u) => isDue({ now, timeZone: u.timezone, hour: u.autoRunHour, minute: u.autoRunMinute, lastRunAt: u.lastAutoRunAt }));
  const results: Record<string, unknown>[] = [];
  let deferred = 0;
  for (const u of due) {
    if (Date.now() - t0 > BUDGET_MS) { deferred++; continue; }
    // claim the day atomically so overlapping firings cannot double-run a user
    const claim = await prisma.huntSettings.updateMany({ where: { userId: u.userId, lastAutoRunAt: u.lastAutoRunAt }, data: { lastAutoRunAt: now } });
    if (!claim.count) continue;
    const r = await runHunt(u.userId, "cron").catch((e) => ({ error: e instanceof Error ? e.message : "failed" }));
    results.push({ userId: u.userId, ...("error" in r ? { error: r.error } : { queued: r.queued, fresh: r.fresh, fetched: r.fetched, partial: r.partial }) });
  }
  return Response.json({ at: now.toISOString(), enabled: users.length, due: due.length, ran: results.length, deferred, results });
}
