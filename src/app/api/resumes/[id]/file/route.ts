import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { safeFileName } from "@/lib/uploads";

export const runtime = "nodejs";

/** Owner-only download of the original resume file. Never cached publicly. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return new Response("Sign in required", { status: 401 });
  const { id } = await ctx.params;
  const r = await prisma.resume.findFirst({ where: { id, userId: session.user.id }, select: { fileData: true, fileName: true, mimeType: true } });
  if (!r?.fileData) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(r.fileData), {
    headers: {
      "Content-Type": r.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFileName(r.fileName)}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
