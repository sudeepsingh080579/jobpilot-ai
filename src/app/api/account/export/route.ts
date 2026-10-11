import { auth } from "@/auth";
import { scrub } from "@/lib/export";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** GDPR/CCPA access and portability: every row that belongs to the signed-in user, as JSON. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const limit = await rateLimit(`export:${session.user.id}`, 5, 60 * 60_000);
  if (!limit.ok) return Response.json({ error: "Too many exports. Try again later." }, { status: 429 });
  const data = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      niches: true,
      jobs: { include: { drafts: true } },
      resumes: true,
      coverLetters: true,
      companies: true,
      contacts: { include: { messages: true } },
      cars: true,
      skills: true,
      posts: true,
      decks: true,
      interviews: true,
      negotiations: true,
      reminders: true,
      messages: true,
      pushSubs: { select: { id: true, createdAt: true } },
      templates: true,
      swot: true,
      subscription: true,
      aiUsage: true,
    },
  });
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: scrub(data) }, null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="jobpilot-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
