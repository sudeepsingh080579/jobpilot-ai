const FILLERS = ["um", "uh", "er", "ah", "like", "you know", "basically", "actually", "sort of", "kind of", "literally"];

export function analyzeAnswer(answer: string, durationSec: number, lookFor: string[]) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const fillersFound: { phrase: string; count: number }[] = [];
  let fillerCount = 0;
  for (const phrase of FILLERS) {
    const pattern = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
    const count = (answer.match(pattern) ?? []).length;
    if (count) {
      fillersFound.push({ phrase, count });
      fillerCount += count;
    }
  }
  const lower = answer.toLowerCase();
  const hits = lookFor.filter((item) => item && lower.includes(item.toLowerCase()));
  const coverage = lookFor.length ? hits.length / lookFor.length : 0.5;
  const lengthPoints = words.length >= 90 ? 2 : words.length >= 40 ? 1 : 0;
  const numberPoints = /\d/.test(answer) ? 1 : 0;
  const content = Math.max(0, Math.min(10, Math.round(coverage * 7 + lengthPoints + numberPoints)));
  const wpm = durationSec > 0 ? Math.round(words.length / (durationSec / 60)) : 0;
  let paceNote = "Add a timer so pace can be scored.";
  if (durationSec > 0) {
    if (wpm < 110) paceNote = "Pace is slow for a spoken answer. Aim for 130–160 words per minute.";
    else if (wpm > 180) paceNote = "Pace is rushed. Land one number, then pause.";
    else paceNote = "Pace sits in a comfortable speaking range.";
  }
  return {
    wordCount: words.length,
    fillerCount,
    fillers: fillersFound,
    wpm,
    content,
    paceNote,
    hits,
    missed: lookFor.filter((item) => !hits.includes(item)),
  };
}
