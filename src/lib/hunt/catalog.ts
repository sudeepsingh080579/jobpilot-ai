import verified from "@/lib/hunt/verified-companies.json";
import type { Ats } from "@/lib/hunt/ats";

/** Companies whose public ATS board endpoint returned HTTP 200 with open jobs when verified (17 Oct 2026). */
export type CatalogCompany = { name: string; ats: Ats; token: string; industry: string };
export const VERIFIED_COMPANIES = verified as CatalogCompany[];

/** Suggestions: verified companies not yet in the user's list, ranked by industry overlap with their preferences. */
export function suggestCompanies(existing: { ats: string; boardToken: string }[], industries: string[], limit = 12) {
  const have = new Set(existing.map((e) => `${e.ats}:${e.boardToken.toLowerCase()}`));
  const wants = industries.map((i) => i.toLowerCase());
  return VERIFIED_COMPANIES.filter((c) => !have.has(`${c.ats}:${c.token.toLowerCase()}`))
    .map((c) => ({ c, s: wants.some((w) => c.industry.toLowerCase().includes(w) || w.includes(c.industry.toLowerCase().split(" ")[0])) ? 1 : 0 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((r) => r.c);
}

/** CSV: name,ats,board_token[,industry] (header optional). */
export function parseCompanyCsv(csv: string) {
  const rows: { name: string; ats: Ats; token: string; industry: string }[] = [];
  const errors: string[] = [];
  csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const cells = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (i === 0 && /^name$/i.test(cells[0])) return;
    const [name, ats, token, industry = ""] = cells;
    if (!name || !token || !["greenhouse", "lever", "ashby", "smartrecruiters", "workday"].includes((ats ?? "").toLowerCase())) {
      errors.push(`Line ${i + 1}: expected name,ats(greenhouse|lever|ashby|smartrecruiters|workday),board_token`);
      return;
    }
    rows.push({ name: name.slice(0, 120), ats: ats.toLowerCase() as Ats, token: token.slice(0, 120), industry: industry.slice(0, 80) });
  });
  return { rows: rows.slice(0, 500), errors };
}
