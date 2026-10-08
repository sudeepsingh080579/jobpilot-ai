export const JOURNEY = [
  {
    id: "resume",
    short: "Resume",
    title: "Upload your resume and clear the ATS flags",
    blurb: "Add the file you already use. We score it and point at anything a tracking system would stumble on.",
    cta: "Check my resume",
    href: "/journey/resume",
  },
  {
    id: "niche",
    short: "Niche",
    title: "Name the jobs you want, then see matches",
    blurb: "A title, a place, and a few skills. Then look at roles that fit that picture.",
    cta: "See matching jobs",
    href: "/journey/niche",
  },
  {
    id: "match",
    short: "Match",
    title: "Match one job and tighten the resume",
    blurb: "Pick a description. We show the missing words and write a tailored copy. The original stays.",
    cta: "Optimise for a job",
    href: "/journey/match",
  },
  {
    id: "referral",
    short: "Referral",
    title: "Ask someone on the inside",
    blurb: "Draft a short note you copy yourself. Nothing is sent from here.",
    cta: "Draft the note",
    href: "/journey/referral",
  },
  {
    id: "pitch",
    short: "Pitch",
    title: "Reach companies that are not posting",
    blurb: "Most roles never hit a job board. Pick a company, choose one problem, and get a short deck.",
    cta: "Build a pitch",
    href: "/journey/pitch",
  },
  {
    id: "negotiate",
    short: "Offer",
    title: "Practice the counter before the call",
    blurb: "Set your number, read the script, then rehearse the pushback.",
    cta: "Practice the counter",
    href: "/journey/negotiate",
  },
] as const;

export type JourneyId = (typeof JOURNEY)[number]["id"];

export type JourneySignals = {
  resumeReady: boolean;
  nicheReady: boolean;
  tailored: boolean;
  referralReady: boolean;
  pitchReady: boolean;
  negotiateReady: boolean;
};

export type JourneyStatus = "done" | "current" | "upcoming";

export type JourneyStepView = (typeof JOURNEY)[number] & { status: JourneyStatus };

export function journeyState(signals: JourneySignals) {
  const flags = [
    signals.resumeReady,
    signals.nicheReady,
    signals.tailored,
    signals.referralReady,
    signals.pitchReady,
    signals.negotiateReady,
  ];
  const openAt = flags.findIndex((flag) => !flag);
  const completed = openAt === -1 ? flags.length : openAt;
  const steps: JourneyStepView[] = JOURNEY.map((step, index) => ({
    ...step,
    status: index < completed ? "done" : index === completed ? "current" : "upcoming",
  }));
  return {
    steps,
    completed,
    total: steps.length,
    next: steps.find((step) => step.status === "current") ?? null,
  };
}
