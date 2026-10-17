/** Prefilled application answers from the user's profile, preferences and saved-answers bank. Never invented. */
export type Answer = { question: string; answer: string; source: "profile" | "preferences" | "saved" | "sponsorship" };

export function buildAnswers(input: {
  name: string; email: string; phone: string; location: string; links: string[];
  noticePeriodDays: number | null; currentCtcLakhs: number | null; expectedCtcLakhs: number | null;
  needsSponsorship: boolean; homeCountry: string; jobCountry: string;
  saved: { question: string; answer: string }[];
}): Answer[] {
  const a: Answer[] = [];
  const push = (question: string, answer: string | null | undefined, source: Answer["source"]) => { if (answer) a.push({ question, answer, source }); };
  push("Full name", input.name, "profile");
  push("Email", input.email, "profile");
  push("Phone", input.phone, "profile");
  push("Current location", input.location, "profile");
  for (const l of input.links) push(/linkedin/i.test(l) ? "LinkedIn" : "Link", l, "profile");
  if (input.noticePeriodDays != null) push("Notice period", `${input.noticePeriodDays} days`, "preferences");
  if (input.currentCtcLakhs != null) push("Current CTC", `₹${input.currentCtcLakhs} lakhs per annum`, "preferences");
  if (input.expectedCtcLakhs != null) push("Expected CTC", `₹${input.expectedCtcLakhs} lakhs per annum`, "preferences");
  const abroad = input.jobCountry && input.jobCountry !== input.homeCountry;
  push(
    "Will you now or in the future require visa sponsorship?",
    abroad ? (input.needsSponsorship ? `Yes. I will require visa sponsorship to work in ${input.jobCountry}.` : "No.") : `No. I am authorised to work in ${input.homeCountry}.`,
    "sponsorship",
  );
  for (const s of input.saved) push(s.question, s.answer, "saved");
  return a;
}

export function hasSalaryAnswer(input: { expectedCtcLakhs: number | null; saved: { question: string }[] }) {
  return input.expectedCtcLakhs != null || input.saved.some((s) => /salary|compensation|ctc/i.test(s.question));
}
