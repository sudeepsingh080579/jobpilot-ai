import { prisma } from "@/lib/prisma";
import { runHunt } from "@/server/hunt-store";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Scheduled runs (Vercel Cron). Requires Authorization: Bearer CRON_SECRET. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "unauthorized" }, { status: 401 });
  const users = await prisma.huntSettings.findMany({ where: { autoRun: true }, select: { userId: true }, take: 20 });
  const results = [];
  for (const u of users) {
    const r = await runHunt(u.userId, "cron").catch((e) => ({ error: e instanceof Error ? e.message : "failed" }));
    results.push({ userId: u.userId, ...("error" in r ? { error: r.error } : { queued: r.queued, fresh: r.fresh }) });
  }
  return Response.json({ ran: results.length, results });
}
