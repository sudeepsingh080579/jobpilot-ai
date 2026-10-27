import { exportFileName, renderDocx, renderPdf } from "@/lib/resume/export";
import type { ResumeContent } from "@/lib/resume/types";

const TYPES = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" } as const;

export async function resumeFileResponse(content: ResumeContent, format: string | null, opts: { version: number; label: string; title: string }) {
  const fmt = format === "docx" ? "docx" : "pdf";
  const bytes = fmt === "pdf" ? await renderPdf(content, { title: opts.title }) : await renderDocx(content, { title: opts.title });
  const name = exportFileName(content.name || "Resume", opts.version, fmt, opts.label);
  return new Response(Buffer.from(bytes), {
    headers: { "Content-Type": TYPES[fmt], "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  });
}
