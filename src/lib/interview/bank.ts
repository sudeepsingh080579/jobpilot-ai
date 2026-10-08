export type BankQuestion = { category: string; prompt: string; lookFor: string[]; mode: string };

export const QUESTION_BANK: BankQuestion[] = [
  { category: "Leadership", mode: "behavioral", prompt: "Tell me about a decision you made that a strong staff engineer disagreed with.", lookFor: ["decision", "risk", "stakeholder"] },
  { category: "Leadership", mode: "behavioral", prompt: "How do you run a team that spans India and US hours?", lookFor: ["handoff", "written", "timezone"] },
  { category: "Leadership", mode: "behavioral", prompt: "Describe a time you stopped a project that had momentum.", lookFor: ["tradeoff", "cost", "focus"] },
  { category: "Platform", mode: "technical", prompt: "Walk through how you would replace a ticket queue with a paved path.", lookFor: ["self-serve", "lead time", "ticket"] },
  { category: "Platform", mode: "technical", prompt: "How do you choose between Kubernetes on one cloud and a multi-cloud estate?", lookFor: ["aws", "complexity", "team"] },
  { category: "Reliability", mode: "technical", prompt: "An error budget is gone by the second week. What do you do?", lookFor: ["error budget", "feature", "incident"] },
  { category: "Reliability", mode: "behavioral", prompt: "Tell me about an incident where the first explanation was wrong.", lookFor: ["postmortem", "detection", "on-call"] },
  { category: "Cost", mode: "technical", prompt: "How have you made a cloud bill understandable to a CFO?", lookFor: ["unit cost", "finance", "owner"] },
  { category: "Cost", mode: "technical", prompt: "Where do commitment discounts hide a design problem?", lookFor: ["finops", "waste", "architecture"] },
  { category: "Delivery", mode: "technical", prompt: "What does a healthy CI/CD system look like for forty squads?", lookFor: ["ci/cd", "golden path", "github actions"] },
  { category: "Security", mode: "technical", prompt: "How do you keep IAM from becoming a ticket type of its own?", lookFor: ["iam", "access", "security"] },
  { category: "People", mode: "behavioral", prompt: "Tell me about a manager you hired who did not work out. What did you miss?", lookFor: ["hired", "feedback", "expectation"] },
  { category: "People", mode: "behavioral", prompt: "How do you coach a principal engineer who does not want a team?", lookFor: ["scope", "influence", "staff"] },
  { category: "Stakeholder", mode: "behavioral", prompt: "A product director wants a one-off pipeline. How do you handle the exception?", lookFor: ["exception", "product", "platform"] },
  { category: "Stakeholder", mode: "behavioral", prompt: "How do you present risk to a CEO without a tool diagram?", lookFor: ["risk", "customer", "plain"] },
  { category: "HR", mode: "behavioral", prompt: "Why are you looking, and why this altitude?", lookFor: ["scope", "reason", "level"] },
  { category: "HR", mode: "behavioral", prompt: "What will you not take, even if the title is flattering?", lookFor: ["floor", "scope", "values"] },
  { category: "Case", mode: "case", prompt: "You inherit a 40-person DevOps org measured on tickets. Outline the first 90 days.", lookFor: ["90", "metric", "queue"] },
  { category: "Case", mode: "case", prompt: "A migration is late and the bill is up. What do you pause?", lookFor: ["pause", "cost", "migration"] },
  { category: "Case", mode: "managerial", prompt: "Two teams page each other for the same incident. Redesign the ownership.", lookFor: ["ownership", "on-call", "service"] },
  { category: "Behavioral", mode: "behavioral", prompt: "Tell me about a number you are proud of that was not a vanity metric.", lookFor: ["number", "customer", "cost"] },
  { category: "Behavioral", mode: "behavioral", prompt: "Describe a vendor negotiation that changed the architecture.", lookFor: ["vendor", "cost", "lock-in"] },
  { category: "Behavioral", mode: "behavioral", prompt: "When did you last change your mind in public?", lookFor: ["changed", "evidence", "team"] },
  { category: "Technical", mode: "technical", prompt: "How would you introduce OpenTelemetry without a year-long program?", lookFor: ["opentelemetry", "one service", "baseline"] },
];

export function pickQuestions(mode: string, count = 5) {
  const pool = QUESTION_BANK.filter((item) => mode === "mixed" || item.mode === mode || item.category.toLowerCase() === mode);
  const source = pool.length >= count ? pool : QUESTION_BANK;
  return source.slice(0, count);
}
