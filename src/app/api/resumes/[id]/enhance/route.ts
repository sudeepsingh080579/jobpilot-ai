import { z } from "zod";
import { auth } from "@/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { enhanceForUser } from "@/server/resume-enhance";

export const runtime = "nodejs";
export const maxDuration = 30;

const body = z.object({ familyId: z.string().max(40).optional(), save: z.boolean().optional() });

/** Enhance an uploaded resume for a target role family. `save: true` stores a new version; otherwise it is a preview. */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const limit = await rateLimit(`enhance:${session.user.id}`, LIMITS.api.max, LIMITS.api.windowMs);
  if (!limit.ok) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const parsed = body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Bad request" }, { status: 400 });
  const { id } = await ctx.params;
  const result = await enhanceForUser({ userId: session.user.id, resumeId: id, familyId: parsed.data.familyId, save: parsed.data.save === true });
  if (!result) return Response.json({ error: "Resume not found" }, { status: 404 });
  return Response.json(result);
}
