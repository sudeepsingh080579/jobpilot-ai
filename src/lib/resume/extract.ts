import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export type Extracted = { ok: true; text: string; kind: "pdf" | "docx" | "txt" } | { ok: false; error: string; status: number };

/** Text from an uploaded PDF, DOCX or TXT. Checks the file signature, not just the extension. */
export async function extractResumeText(fileName: string, buffer: Buffer): Promise<Extracted> {
  const name = fileName.toLowerCase();
  try {
    if (name.endsWith(".docx")) {
      if (buffer.subarray(0, 2).toString("latin1") !== "PK") return { ok: false, error: "That does not look like a real .docx file.", status: 422 };
      const result = await mammoth.extractRawText({ buffer });
      return { ok: true, text: result.value, kind: "docx" };
    }
    if (name.endsWith(".pdf")) {
      if (!buffer.subarray(0, 1024).toString("latin1").includes("%PDF")) return { ok: false, error: "That does not look like a real PDF.", status: 422 };
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const extracted = await extractText(pdf, { mergePages: true });
      return { ok: true, text: Array.isArray(extracted.text) ? extracted.text.join("\n") : String(extracted.text ?? ""), kind: "pdf" };
    }
    if (name.endsWith(".txt")) return { ok: true, text: buffer.toString("utf8"), kind: "txt" };
  } catch {
    return { ok: false, error: "Could not read that file. Paste the text instead.", status: 422 };
  }
  return { ok: false, error: "Upload a PDF, DOCX, or TXT file.", status: 400 };
}
