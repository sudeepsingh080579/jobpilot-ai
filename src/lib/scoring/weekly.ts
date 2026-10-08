export type WeeklyInput = {
  saved: number;
  applied: number;
  screening: number;
  interviewing: number;
  offers: number;
  staleFollowups: number;
  outreachDue: number;
  resumeScore: number | null;
  hasPrimaryResume: boolean;
  postsThisWeek: number;
};

export type PlanItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  tone: "now" | "soon" | "steady";
};

export function buildWeeklyPlan(input: WeeklyInput): PlanItem[] {
  const items: PlanItem[] = [];
  if (!input.hasPrimaryResume) {
    items.push({
      id: "resume",
      title: "Put a resume on the desk",
      detail: "Paste or upload the current one, then score it before tailoring.",
      href: "/resumes",
      tone: "now",
    });
  } else if ((input.resumeScore ?? 100) < 75) {
    items.push({
      id: "score",
      title: "Lift the resume score",
      detail: `The primary resume is at ${input.resumeScore}. Fix the red and yellow checks.`,
      href: "/resumes",
      tone: "now",
    });
  }
  if (input.offers > 0) {
    items.push({
      id: "offer",
      title: "Prepare the counter before the call",
      detail: "Write the script, then rehearse the pushback.",
      href: "/negotiate",
      tone: "now",
    });
  }
  if (input.interviewing > 0) {
    items.push({
      id: "mock",
      title: "Rehearse the live conversations",
      detail: `${input.interviewing} role${input.interviewing === 1 ? "" : "s"} sit in interviewing.`,
      href: "/interview",
      tone: "now",
    });
  }
  if (input.staleFollowups > 0) {
    items.push({
      id: "follow",
      title: "Write the follow-ups",
      detail: `${input.staleFollowups} application${input.staleFollowups === 1 ? "" : "s"} have gone quiet.`,
      href: "/tracker",
      tone: "soon",
    });
  }
  if (input.outreachDue > 0) {
    items.push({
      id: "outreach",
      title: "Draft the next outreach note",
      detail: "Copy it yourself. Nothing is sent from this desk.",
      href: "/network",
      tone: "soon",
    });
  }
  if (input.saved > 0 && input.applied === 0 && input.screening === 0 && input.interviewing === 0) {
    items.push({
      id: "apply",
      title: "Advance one saved role",
      detail: "Tailor, then move a single strong fit to applied.",
      href: "/tracker",
      tone: "soon",
    });
  }
  if (input.saved < 3) {
    items.push({
      id: "search",
      title: "Add roles worth a conversation",
      detail: "Search the sample market or paste a description you already have.",
      href: "/search",
      tone: "steady",
    });
  }
  if (input.postsThisWeek < 3) {
    items.push({
      id: "posts",
      title: "Draft this week's three posts",
      detail: "They stay in drafts until you publish them.",
      href: "/presence",
      tone: "steady",
    });
  }
  if (items.length === 0) {
    items.push({
      id: "steady",
      title: "Keep the funnel warm",
      detail: "Review fit scores and retire roles that are only adjacent.",
      href: "/strategy",
      tone: "steady",
    });
  }
  return items.slice(0, 6);
}
