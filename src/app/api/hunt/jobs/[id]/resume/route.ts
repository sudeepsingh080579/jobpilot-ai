import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseContent } from "@/server/resume-enhance";
import { resumeFileResponse } from "@/server/resume-files";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET ?format=pdf|docx: the guardrailed, ATS-compliant resume tailored to one queued role (owner only). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const job = await prisma.huntJob.findFirst({ where: { id, userId: session.user.id }, select: { tailoredContent: true, company: true, title: true } });
  if (!job || job.tailoredContent === "{}") return Response.json({ error: "No tailored resume for this role" }, { status: 404 });
  const label = `${job.company}`.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30) || "Tailored";
  return resumeFileResponse(parseContent(job.tailoredContent), new URL(request.url).searchParams.get("format"), { version: 1, label: `Tailored_${label}`, title: `Resume - ${job.title}` });
}
