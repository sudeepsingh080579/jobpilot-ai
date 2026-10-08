export const AI_TASKS = [
  "chat",
  "niche_suggest",
  "fit_narrative",
  "skill_map",
  "swot",
  "car_scenarios",
  "resume_from_car",
  "resume_tailor",
  "cover_letter",
  "stage_draft",
  "company_problems",
  "pitch_deck",
  "pitch_revise",
  "linkedin_posts",
  "linkedin_profile",
  "interview_questions",
  "interview_feedback",
  "negotiation_script",
  "negotiation_turn",
  "negotiation_report",
  "weekly_narrative",
  "outreach_draft",
] as const;

export type AiTask = (typeof AI_TASKS)[number];

export type AiResult<T> = { data: T; mode: "mock" | "live"; task: AiTask };
