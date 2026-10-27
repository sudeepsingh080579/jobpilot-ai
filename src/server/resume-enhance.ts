import { prisma } from "@/lib/prisma";
import { parseJson } from "@/lib/json";
import { enhanceResume, renderAtsText } from "@/lib/resume/enhance";
import { ROLE_FAMILIES, suggestFamilies } from "@/lib/resume/roles";
import { emptyResume, type ResumeContent } from "@/lib/resume/types";

export function parseContent(raw: string): ResumeContent {
  return { ...emptyResume(), ...parseJson<Partial<ResumeContent>>(raw, {}) };
}

/** Role families to offer for a resume: best matches first, then the rest. */
export function roleOptions(content: ResumeContent, text: string) {
  const ranked = suggestFamilies({ titles: content.experience.map((r) => r.title), headline: content.headline, text });
  const top = new Set(ranked.slice(0, 4).map((r) => r.family.id));
  return {
    suggested: ranked.slice(0, 4).map((r) => ({ id: r.family.id, label: r.family.label, titles: r.family.titles.slice(0, 4), match: r.score })),
    others: ROLE_FAMILIES.filter((f) => !top.has(f.id)).map((f) => ({ id: f.id, label: f.label, titles: f.titles.slice(0, 4) })),
  };
}

/**
 * Enhance a user's uploaded resume. `save` creates a new ResumeVersion (original Resume row is never modified).
 * Always scoped to the user.
 */
export async function enhanceForUser(input: { userId: string; resumeId: string; familyId?: string; save: boolean }) {
  const resume = await prisma.resume.findFirst({ where: { id: input.resumeId, userId: input.userId } });
  if (!resume) return null;
  const result = enhanceResume({ rawText: resume.rawText || "", familyId: input.familyId });
  const enhancedText = renderAtsText(result.enhanced);
  let saved: { id: string; version: number } | null = null;
  if (input.save) {
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const last = await prisma.resumeVersion.findFirst({ where: { userId: input.userId, resumeId: resume.id }, orderBy: { version: "desc" }, select: { version: true } });
      try {
        const v = await prisma.resumeVersion.create({
          data: {
            userId: input.userId, resumeId: resume.id, version: (last?.version ?? 0) + 1, targetRole: result.family.label,
            content: JSON.stringify(result.enhanced), atsBefore: result.before.score, atsAfter: result.after.score,
            detail: JSON.stringify({ family: result.family.id, changes: result.changes, suggestions: result.suggestions, before: result.before, after: result.after, coverage: result.coverage, novel: result.novel }),
          },
        });
        saved = { id: v.id, version: v.version };
      } catch { /* unique race on version: retry with the next number */ }
    }
  }
  return {
    resumeId: resume.id,
    fileName: resume.fileName,
    saved,
    family: { id: result.family.id, label: result.family.label, titles: result.family.titles },
    roles: roleOptions(result.original, resume.rawText || ""),
    before: result.before,
    after: result.after,
    originalText: resume.rawText || "",
    enhancedText,
    name: result.enhanced.name,
    changes: result.changes.slice(0, 120),
    changeCount: result.changes.length,
    suggestions: result.suggestions,
    coverage: Math.round(result.coverage * 100),
    novelWords: result.novel,
    skills: result.enhanced.skills.flatMap((g) => g.items).slice(0, 30),
    latestTitles: result.enhanced.experience.map((r) => r.title).filter(Boolean).slice(0, 3),
    location: result.enhanced.location,
  };
}
