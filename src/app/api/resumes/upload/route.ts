import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";
import { auth } from "@/auth";
import { LIMITS, rateLimit } from "@/lib/rate-limit";
import { stringifyJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { parseResumeText } from "@/lib/resume/parse";
import { scoreResume } from "@/lib/scoring/resume-score";
import { MAX_UPLOAD_BYTES, storeResumeFile } from "@/lib/uploads";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in required" }, { status: 401 });
  const limit = await rateLimit(`upload:${session.user.id}`, LIMITS.api.max, LIMITS.api.windowMs);
  if (!limit.ok) return Response.json({ error: "Too many requests. Try again in a minute." }, { status: 429 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "Choose a PDF, DOCX, or TXT file." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "Keep the file under 4 MB." }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text = "";
  try {
    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const extracted = await extractText(pdf, { mergePages: true });
      text = Array.isArray(extracted.text) ? extracted.text.join("\n") : String(extracted.text ?? "");
    } else if (name.endsWith(".txt")) {
      text = buffer.toString("utf8");
    } else {
      return Response.json({ error: "Upload a PDF, DOCX, or TXT file." }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "Could not read that file. Paste the text instead." }, { status: 422 });
  }
  if (text.trim().length < 40) return Response.json({ error: "Not enough text in that file. Paste the resume instead." }, { status: 422 });
  const content = parseResumeText(text);
  if (!content.name) content.name = session.user.name ?? "";
  const scored = scoreResume(content);
  const count = await prisma.resume.count({ where: { userId: session.user.id } });
  const stored = await storeResumeFile({
    userId: session.user.id,
    filename: file.name,
    bytes: buffer,
    contentType: file.type || "application/octet-stream",
  });
  const resume = await prisma.resume.create({
    data: {
      userId: session.user.id,
      title: file.name.replace(/\.[^.]+$/, "") || "Uploaded resume",
      template: "ledger",
      isPrimary: count === 0,
      rawText: text,
      content: stringifyJson(content),
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      fileUrl: stored.fileUrl,
      fileData: stored.fileData ? Uint8Array.from(stored.fileData) : null,
      score: scored.score,
      scoreDetail: stringifyJson(scored),
    },
  });
  return Response.json({ id: resume.id });
}
