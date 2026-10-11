import { auth } from "@/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const limit = await rateLimit(`push:${session.user.id}`, LIMITS.api.max, LIMITS.api.windowMs);
  if (!limit.ok) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const body = (await request.json()) as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return Response.json({ error: "Subscription is incomplete." }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: { userId: session.user.id, endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth },
    update: { userId: session.user.id, p256dh: body.keys.p256dh, auth: body.keys.auth },
  });
  return Response.json({ ok: true });
}
