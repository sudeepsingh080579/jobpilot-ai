import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { parseContent } from "@/server/resume-enhance";
import { resumeFileResponse } from "@/server/resume-files";

export const runtime = "nodejs";
export const maxDuration = 30;

/** GET ?format=pdf|docx: ATS-friendly download of a saved enhanced version (owner only). */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const { id } = await ctx.params;
  const v = await prisma.resumeVersion.findFirst({ where: { id, userId: session.user.id } });
  if (!v) return Response.json({ error: "Not found" }, { status: 404 });
  return resumeFileResponse(parseContent(v.content), new URL(request.url).searchParams.get("format"), { version: v.version, label: "ATS", title: "Resume" });
}
