import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { getHuntSettings, ensureSeeded } from "@/server/hunt-store";

export const runtime = "nodejs";
export const maxDuration = 30;

const schema = z.object({
  roles: z.array(z.string().trim().min(2).max(80)).min(1).max(8),
  locations: z.array(z.string().trim().min(2).max(60)).max(10),
  remote: z.boolean().default(true),
  remoteAbroad: z.boolean().default(true),
  hybridAbroad: z.boolean().default(false),
  freshnessDays: z.number().int().min(1).max(30).default(3),
  skills: z.array(z.string().trim().min(1).max(60)).max(60).default([]),
});

/** Save the target roles, locations and freshness window picked in the /start flow. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });
  const limit = await rateLimit(`start-finish:${userId}`, LIMITS.api.max, LIMITS.api.windowMs);
  if (!limit.ok) return Response.json({ error: "Too many requests." }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Pick at least one target role." }, { status: 400 });
  const v = parsed.data;
  const roles = [...new Set(v.roles)].slice(0, 8);
  const locations = [...new Set(v.locations)].slice(0, 10);
  const arrangements = [...(v.remote ? ["remote"] : []), "hybrid", "onsite"];
  await prisma.jobPreferences.upsert({
    where: { userId },
    create: { userId, targetRoles: roles, locations, remoteIndia: v.remote, remoteInternational: v.remoteAbroad, workArrangements: arrangements, skills: v.skills },
    update: { targetRoles: roles, locations, remoteIndia: v.remote, remoteInternational: v.remoteAbroad, workArrangements: arrangements, skills: v.skills },
  });
  await getHuntSettings(userId);
  await prisma.huntSettings.update({ where: { userId }, data: { freshnessDays: v.freshnessDays, remoteAbroad: v.remoteAbroad, hybridAbroad: v.hybridAbroad } });
  await prisma.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });
  await ensureSeeded(userId);
  return Response.json({ ok: true });
}
