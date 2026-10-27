import { describe, expect, it } from "vitest";
import { enhanceResume } from "@/lib/resume/enhance";
import { renderDocx, renderPdf } from "@/lib/resume/export";
import { extractResumeText } from "@/lib/resume/extract";
import { SAMPLE } from "@/lib/resume/sample";

describe("resume extraction round trip", () => {
  const { enhanced } = enhanceResume({ rawText: SAMPLE });
  it("reads text back out of a generated PDF", async () => {
    const r = await extractResumeText("r.pdf", Buffer.from(await renderPdf(enhanced)));
    expect(r.ok && r.text).toContain("EXPERIENCE");
    expect(r.ok && r.text).toContain("Anita Rao");
  });
  it("reads text back out of a generated DOCX", async () => {
    const r = await extractResumeText("r.docx", await renderDocx(enhanced));
    expect(r.ok && r.text).toContain("SKILLS");
  });
  it("rejects files whose signature does not match the extension", async () => {
    expect((await extractResumeText("x.pdf", Buffer.from("hello"))).ok).toBe(false);
    expect((await extractResumeText("x.docx", Buffer.from("hello"))).ok).toBe(false);
    expect((await extractResumeText("x.exe", Buffer.from("hello"))).ok).toBe(false);
  });
});
