export type TranscriptTurn = { role: "recruiter" | "you"; text: string };

const TRADEOFFS = ["equity", "sign-on", "sign on", "bonus", "start date", "remote", "title", "scope", "review", "base"];

export function scoreNegotiation(transcript: TranscriptTurn[], target: string) {
  const yours = transcript.filter((turn) => turn.role === "you").map((turn) => turn.text);
  const joined = yours.join(" \n ").toLowerCase();
  const asked = yours.some((text) => text.includes("?"));
  const anchored = /\d/.test(joined) || (target && joined.includes(target.toLowerCase().slice(0, 6)));
  const tradeoffs = TRADEOFFS.filter((word) => joined.includes(word));
  const folded = /\b(i accept|i'll take it|sounds good|happy to accept)\b/i.test(joined) && tradeoffs.length === 0;
  const anchor = Math.min(10, (anchored ? 6 : 2) + (target && joined.includes(target.replace(/[^\d]/g, "").slice(0, 3)) ? 2 : 0));
  const flexibility = Math.min(10, tradeoffs.length * 2 + (asked ? 2 : 0));
  const clarity = Math.min(10, Math.round(yours.join(" ").split(/\s+/).length / 25) + (anchored ? 3 : 0));
  const composure = folded ? 3 : Math.min(10, 6 + Math.min(4, yours.length));
  const close = Math.min(10, (asked ? 4 : 2) + (tradeoffs.length ? 3 : 0) + (anchored ? 3 : 0));
  const overall = Math.round((anchor + flexibility + clarity + composure + close) / 5);
  return {
    overall,
    criteria: { anchor, flexibility, clarity, composure, close },
    tradeoffs,
    notes: [
      anchored ? "You put a number on the table." : "Name the number you want before you discuss perks.",
      tradeoffs.length ? `Trade-offs mentioned: ${tradeoffs.join(", ")}.` : "Bring a non-salary trade: scope, start date, review timing, or sign-on.",
      folded ? "The transcript accepts before trading." : "You did not fold on the first pass.",
    ],
  };
}
