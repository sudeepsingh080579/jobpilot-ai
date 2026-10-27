/** Verb tables for bullet rewording. Rewording only swaps the opening phrase; it never adds facts. */
const TABLE: [base: string, past: string, gerund: string][] = [
  ["manage", "Managed", "managing"], ["lead", "Led", "leading"], ["develop", "Developed", "developing"], ["build", "Built", "building"],
  ["design", "Designed", "designing"], ["implement", "Implemented", "implementing"], ["maintain", "Maintained", "maintaining"],
  ["deploy", "Deployed", "deploying"], ["create", "Created", "creating"], ["automate", "Automated", "automating"],
  ["optimize", "Optimized", "optimizing"], ["optimise", "Optimised", "optimising"], ["reduce", "Reduced", "reducing"],
  ["improve", "Improved", "improving"], ["support", "Supported", "supporting"], ["monitor", "Monitored", "monitoring"],
  ["migrate", "Migrated", "migrating"], ["handle", "Handled", "handling"], ["coordinate", "Coordinated", "coordinating"],
  ["administer", "Administered", "administering"], ["configure", "Configured", "configuring"], ["analyze", "Analyzed", "analyzing"],
  ["analyse", "Analysed", "analysing"], ["test", "Tested", "testing"], ["write", "Wrote", "writing"], ["own", "Owned", "owning"],
  ["ensure", "Ensured", "ensuring"], ["drive", "Drove", "driving"], ["deliver", "Delivered", "delivering"],
  ["establish", "Established", "establishing"], ["collaborate", "Collaborated", "collaborating"], ["provide", "Provided", "providing"],
  ["perform", "Performed", "performing"], ["execute", "Executed", "executing"], ["conduct", "Conducted", "conducting"],
  ["prepare", "Prepared", "preparing"], ["integrate", "Integrated", "integrating"], ["architect", "Architected", "architecting"],
  ["mentor", "Mentored", "mentoring"], ["train", "Trained", "training"], ["resolve", "Resolved", "resolving"], ["plan", "Planned", "planning"],
  ["launch", "Launched", "launching"], ["scale", "Scaled", "scaling"], ["secure", "Secured", "securing"], ["document", "Documented", "documenting"],
  ["review", "Reviewed", "reviewing"], ["work", "Worked", "working"], ["troubleshoot", "Troubleshot", "troubleshooting"],
  ["debug", "Debugged", "debugging"], ["refactor", "Refactored", "refactoring"], ["coach", "Coached", "coaching"], ["contribute", "Contributed", "contributing"],
  ["define", "Defined", "defining"], ["enable", "Enabled", "enabling"], ["streamline", "Streamlined", "streamlining"], ["standardize", "Standardized", "standardizing"],
  ["standardise", "Standardised", "standardising"], ["evaluate", "Evaluated", "evaluating"], ["research", "Researched", "researching"], ["negotiate", "Negotiated", "negotiating"],
  ["oversee", "Oversaw", "overseeing"], ["supervise", "Supervised", "supervising"], ["organize", "Organized", "organizing"], ["organise", "Organised", "organising"],
  ["generate", "Generated", "generating"], ["install", "Installed", "installing"], ["upgrade", "Upgraded", "upgrading"], ["track", "Tracked", "tracking"],
];

const GERUND = new Map(TABLE.map(([, past, g]) => [g, past]));
const BASE = new Map<string, string>();
for (const [b, past] of TABLE) {
  BASE.set(b, past);
  BASE.set(b.endsWith("e") ? `${b}s` : b.endsWith("y") ? `${b.slice(0, -1)}ies` : /(s|sh|ch|x)$/.test(b) ? `${b}es` : `${b}s`, past);
}
/** Past-tense forms already in the resume count as action verbs, plus other strong openers. */
export const ACTION_VERBS = new Set<string>([
  ...TABLE.map(([, past]) => past.toLowerCase()),
  "accelerated", "achieved", "adopted", "advised", "aligned", "authored", "boosted", "cut", "consolidated", "decreased", "diagnosed", "eliminated", "engineered", "expanded",
  "founded", "grew", "hired", "identified", "increased", "initiated", "instituted", "introduced", "invented", "modernized", "modernised", "onboarded", "orchestrated", "owned", "partnered",
  "piloted", "pioneered", "ran", "rebuilt", "recruited", "redesigned", "resolved", "restructured", "rolled", "saved", "shipped", "simplified", "spearheaded", "sped", "stabilized",
  "stabilised", "strengthened", "transitioned", "transformed", "unified", "upgraded", "won", "applied", "assisted", "built", "led", "wrote", "drove", "oversaw",
]);
/** Words rewording is allowed to introduce, beyond the original bullet's own words. */
export const REWORD_WORDS = new Set<string>([...TABLE.map(([, p]) => p.toLowerCase()), "contributed", "to", "owned"]);

const stripLead = (s: string) => s.replace(/^[\s•·▪●◦■►➢➤✓*+-]+/, "").trim();
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export type Reword = { text: string; rule: string | null };

/** Swap a weak or tense-inconsistent opening for a strong past-tense verb. Facts after the opener are untouched. */
export function rewordBullet(input: string, opts: { current?: boolean } = {}): Reword {
  let s = stripLead(input.replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " "));
  let rule: string | null = null;
  const done = (text: string, r: string) => ({ text: cap(text.replace(/\.+$/, "").trim()), rule: r });
  let m: RegExpMatchArray | null;

  if ((m = s.match(/^I(?:'ve| have| had)?\s+(\w+)\s+(.*)$/i))) {
    const w = m[1].toLowerCase();
    if (/ed$/.test(w) || GERUND.has(w) === false && BASE.has(w) === false && /^(led|built|ran|wrote|drove|owned)$/.test(w)) { s = `${m[1]} ${m[2]}`; rule = "removed first person"; }
    else if (BASE.has(w)) { s = `${BASE.get(w)} ${m[2]}`; rule = "removed first person"; }
  }
  if ((m = s.match(/^(?:was |were |am |is )?(?:responsible for|in charge of|accountable for|tasked with|charged with)\s+(?:the\s+)?(.*)$/i))) {
    const g = m[1].match(/^(\w+ing)\b\s*(.*)$/i);
    if (g && GERUND.has(g[1].toLowerCase())) return done(`${GERUND.get(g[1].toLowerCase())} ${g[2]}`, "weak opener → action verb");
    return done(`Owned ${m[1]}`, "weak opener → action verb");
  }
  if ((m = s.match(/^(?:duties|responsibilities)\s+(?:included|include)\s*:?\s*(.*)$/i))) {
    const g = m[1].match(/^(\w+ing)\b\s*(.*)$/i);
    if (g && GERUND.has(g[1].toLowerCase())) return done(`${GERUND.get(g[1].toLowerCase())} ${g[2]}`, "weak opener → action verb");
  }
  if ((m = s.match(/^(?:worked on|work on|working on)\s+(.*)$/i))) return done(`Contributed to ${m[1]}`, "weak opener → action verb");
  if ((m = s.match(/^(?:involved in|participated in|took part in)\s+(.*)$/i))) return done(`Contributed to ${m[1]}`, "weak opener → action verb");
  if ((m = s.match(/^(\w+)\b\s*(.*)$/))) {
    const w = m[1].toLowerCase();
    if (GERUND.has(w)) return done(`${GERUND.get(w)} ${m[2]}`, "gerund → past tense");
    if (!opts.current && BASE.has(w) && w !== "test" && w !== "plan" && w !== "work" && w !== "support" && w !== "review" && w !== "research" && w !== "track" && w !== "document" && w !== "train" && w !== "design" && w !== "own")
      return done(`${BASE.get(w)} ${m[2]}`, "tense → past");
    if (!opts.current && BASE.has(w) && /^(test|plan|support|review|research|track|document|train|design|own|work)$/.test(w) && m[2]) {
      // Ambiguous with nouns ("Design review ..."); only convert when followed by a clear object word.
      if (/^(the|a|an|and|on-call|all|our|multiple|several|\d)/i.test(m[2])) return done(`${BASE.get(w)} ${m[2]}`, "tense → past");
    }
  }
  return { text: cap(s.replace(/\.+$/, "").trim()), rule };
}

export function splitLongBullet(b: string, max = 260): string[] {
  if (b.length <= max) return [b];
  const parts = b.split(/;\s+/);
  if (parts.length < 2) return [b];
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && (cur + "; " + p).length > max) { out.push(cur); cur = p; } else cur = cur ? `${cur}; ${p}` : p;
  }
  if (cur) out.push(cur);
  return out.map((x) => cap(x.trim()));
}
