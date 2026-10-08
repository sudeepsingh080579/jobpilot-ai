export type RouteHit = { module: string; label: string; href: string };

const RULES: { test: RegExp; hit: RouteHit }[] = [
  { test: /cover letter|letter of interest/i, hit: { module: "letters", label: "Cover letters", href: "/letters" } },
  { test: /\bats\b|keyword match|applicant tracking/i, hit: { module: "resumes", label: "ATS match", href: "/resumes" } },
  { test: /tailor|rewrite (my )?resume|customize resume/i, hit: { module: "resumes", label: "Resume tailoring", href: "/resumes" } },
  { test: /why (i'm|i am|am i).*(fit|right)|fit score|right fit/i, hit: { module: "strategy", label: "Fit", href: "/strategy" } },
  { test: /mock interview|interview question|practice interview/i, hit: { module: "interview", label: "Interview studio", href: "/interview" } },
  { test: /negotiat|counter-?offer|salary/i, hit: { module: "negotiate", label: "Negotiation", href: "/negotiate" } },
  { test: /referral|outreach|linkedin note|intro request/i, hit: { module: "network", label: "Network", href: "/network" } },
  { test: /pitch|slide|deck|win method/i, hit: { module: "pitch", label: "Pitch desk", href: "/pitch" } },
  { test: /linkedin (post|headline|about)|write (a )?post|presence/i, hit: { module: "presence", label: "Presence", href: "/presence" } },
  { test: /remind|follow-?up date|nudge me/i, hit: { module: "reminders", label: "Reminders", href: "/reminders" } },
  { test: /swot|skill map|niche|car\b|challenge-action/i, hit: { module: "strategy", label: "Strategy", href: "/strategy" } },
  { test: /search|find (me )?jobs|open roles/i, hit: { module: "search", label: "Search", href: "/search" } },
  { test: /tracker|kanban|pipeline|application/i, hit: { module: "tracker", label: "Tracker", href: "/tracker" } },
  { test: /resume|cv\b/i, hit: { module: "resumes", label: "Resume", href: "/resumes" } },
];

export function routeIntent(message: string): RouteHit {
  for (const rule of RULES) {
    if (rule.test.test(message)) return rule.hit;
  }
  return { module: "assistant", label: "Weekly plan", href: "/dashboard" };
}
