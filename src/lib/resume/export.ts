/**
 * ATS-friendly exports, generated on the server: one column, real text (selectable),
 * standard fonts, no tables, no images, no text boxes.
 */
import { Document, HeadingLevel, LevelFormat, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { ResumeContent } from "@/lib/resume/types";

type Block =
  | { t: "name"; text: string }
  | { t: "line"; text: string; bold?: boolean }
  | { t: "heading"; text: string }
  | { t: "bullet"; text: string }
  | { t: "gap" };

/** Same content and order as renderAtsText, but typed so each format can style it. */
export function toBlocks(c: ResumeContent): Block[] {
  const b: Block[] = [{ t: "name", text: c.name }];
  if (c.headline) b.push({ t: "line", text: c.headline });
  const contact = [c.location, c.email, c.phone, ...c.links].filter(Boolean).join(" | ");
  if (contact) b.push({ t: "line", text: contact });
  const head = (t: string) => b.push({ t: "gap" }, { t: "heading", text: t });
  if (c.summary) { head("SUMMARY"); b.push({ t: "line", text: c.summary }); }
  if (c.skills.length) { head("SKILLS"); for (const g of c.skills) b.push({ t: "line", text: g.group && g.group !== "Skills" ? `${g.group}: ${g.items.join(", ")}` : g.items.join(", ") }); }
  if (c.experience.length) {
    head("EXPERIENCE");
    c.experience.forEach((r, i) => {
      if (i) b.push({ t: "gap" });
      b.push({ t: "line", text: [r.title, r.company, r.location].filter(Boolean).join(" | "), bold: true });
      const dates = [r.start, r.end].filter(Boolean).join(" – ");
      if (dates) b.push({ t: "line", text: dates });
      for (const x of r.bullets) b.push({ t: "bullet", text: x });
    });
  }
  if (c.projects?.length) {
    head("PROJECTS");
    for (const p of c.projects) { if (p.name && p.name !== "Projects") b.push({ t: "line", text: p.name, bold: true }); for (const x of p.bullets) b.push({ t: "bullet", text: x }); }
  }
  if (c.education.length) { head("EDUCATION"); for (const e of c.education) b.push({ t: "line", text: [e.credential, e.school, e.year].filter(Boolean).join(" | ") }); }
  if (c.certifications.length) { head("CERTIFICATIONS"); for (const x of c.certifications) b.push({ t: "bullet", text: x }); }
  for (const a of c.additional ?? []) { head(a.heading.toUpperCase()); for (const l of a.lines) b.push({ t: "bullet", text: l }); }
  return b;
}

const WIN_MAP: Record<string, string> = { "\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"', "\u2026": "...", "\u00a0": " ", "\u2010": "-", "\u2011": "-", "\u2012": "-", "\u2212": "-", "\u2192": "->", "\u2022": "\u2022" };
/** Standard PDF fonts are WinAnsi: map or drop what they cannot encode instead of throwing. */
function winSafe(font: PDFFont, s: string) {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const m = WIN_MAP[ch] ?? ch;
    try { font.encodeText(m); out += m; } catch {
      const base = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      try { font.encodeText(base); out += base; } catch { out += "?"; }
    }
  }
  return out;
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const tryLine = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(tryLine, size) <= width) cur = tryLine;
    else {
      if (cur) lines.push(cur);
      // Hard-break a single token wider than the line (long URLs).
      let w = word;
      while (font.widthOfTextAtSize(w, size) > width) {
        let n = w.length;
        while (n > 1 && font.widthOfTextAtSize(w.slice(0, n), size) > width) n--;
        lines.push(w.slice(0, n));
        w = w.slice(n);
      }
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export async function renderPdf(content: ResumeContent, meta: { title?: string } = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  pdf.setTitle(meta.title ?? `${content.name} - Resume`);
  pdf.setAuthor(content.name);
  pdf.setProducer("JobPilot AI");
  pdf.setCreator("JobPilot AI");
  const W = 595.28, H = 841.89, M = 52;
  let page = pdf.addPage([W, H]);
  let y = H - M;
  const ensure = (need: number) => { if (y - need < M) { page = pdf.addPage([W, H]); y = H - M; } };
  const draw = (text: string, o: { size: number; font: PDFFont; indent?: number; lead?: number; marker?: string }) => {
    const indent = o.indent ?? 0;
    const lines = wrap(o.font, winSafe(o.font, text), o.size, W - 2 * M - indent);
    lines.forEach((ln, i) => {
      ensure(o.size * (o.lead ?? 1.35));
      y -= o.size * (o.lead ?? 1.35);
      // The bullet glyph is real text so extractors read "• text" on one line.
      page.drawText(i === 0 && o.marker ? `${o.marker} ${ln}` : ln, { x: M + (i === 0 || !o.marker ? Math.max(0, indent - (o.marker ? 10 : 0)) : indent), y, size: o.size, font: o.font, color: rgb(0.08, 0.08, 0.08) });
    });
  };
  for (const b of toBlocks(content)) {
    if (b.t === "name") draw(b.text, { size: 20, font: bold, lead: 1.25 });
    else if (b.t === "heading") { y -= 2; draw(b.text, { size: 11, font: bold, lead: 1.5 }); }
    else if (b.t === "gap") y -= 5;
    else if (b.t === "bullet") draw(b.text, { size: 10, font: reg, indent: 14, marker: "\u2022" });
    else draw(b.text, { size: 10, font: b.bold ? bold : reg });
  }
  return pdf.save();
}

export async function renderDocx(content: ResumeContent, meta: { title?: string } = {}): Promise<Buffer> {
  const FONT = "Calibri";
  const run = (text: string, o: { bold?: boolean; size?: number } = {}) => new TextRun({ text, bold: o.bold, size: (o.size ?? 10.5) * 2, font: FONT });
  const kids: Paragraph[] = [];
  for (const b of toBlocks(content)) {
    if (b.t === "name") kids.push(new Paragraph({ children: [run(b.text, { bold: true, size: 20 })], spacing: { after: 40 } }));
    else if (b.t === "heading") kids.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(b.text, { bold: true, size: 12 })], spacing: { before: 120, after: 40 } }));
    else if (b.t === "gap") continue;
    else if (b.t === "bullet") kids.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [run(b.text)], spacing: { after: 20 } }));
    else kids.push(new Paragraph({ children: [run(b.text, { bold: b.bold })], spacing: { after: 20 } }));
  }
  const doc = new Document({
    creator: "JobPilot AI",
    title: meta.title ?? `${content.name} - Resume`,
    styles: { default: { document: { run: { font: FONT, size: 21 } } }, paragraphStyles: [{ id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: FONT, bold: true, size: 24, color: "000000" }, paragraph: { spacing: { before: 120, after: 40 } } }] },
    numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 220 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 900, bottom: 900, left: 1000, right: 1000 } } }, children: kids }],
  });
  return Packer.toBuffer(doc);
}

export function exportFileName(name: string, version: number, ext: "pdf" | "docx", label = "ATS") {
  const base = name.trim().replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Resume";
  return `${base}_Resume_${label}_v${version}.${ext}`;
}
