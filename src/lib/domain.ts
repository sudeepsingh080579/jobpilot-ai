export const JOB_STAGES = [
  { id: "SAVED", label: "Saved" },
  { id: "APPLIED", label: "Applied" },
  { id: "SCREENING", label: "Screening" },
  { id: "INTERVIEWING", label: "Interviewing" },
  { id: "OFFER", label: "Offer" },
  { id: "REJECTED", label: "Rejected" },
] as const;

export type JobStage = (typeof JOB_STAGES)[number]["id"];

export const COMPANY_STAGES = [
  { id: "RESEARCHING", label: "Researching" },
  { id: "WARM", label: "Warm" },
  { id: "OUTREACH", label: "Outreach" },
  { id: "CONVERSATION", label: "Conversation" },
  { id: "PARKED", label: "Parked" },
] as const;

export const CONTACT_TYPES = [
  { id: "POTENTIAL_REFERRER", label: "Potential referrer" },
  { id: "HIRING_MANAGER", label: "Hiring manager" },
  { id: "TOP_MANAGEMENT", label: "Top management" },
  { id: "COLD_OUTREACH", label: "Cold outreach" },
] as const;

export const OUTREACH_STEPS = [
  { id: "PITCH", label: "Pitch", hint: "The first note. Say why you are writing and what you want." },
  { id: "FOLLOW_UP_1", label: "Follow-up 1", hint: "A short nudge. Reference one specific thing they published or shipped." },
  { id: "FOLLOW_UP_2", label: "Follow-up 2", hint: "Add a useful observation. Still no ask to 'pick your brain'." },
  { id: "FINAL", label: "Final", hint: "Close the loop. Leave the door open and stop." },
] as const;

export type OutreachStepId = (typeof OUTREACH_STEPS)[number]["id"];

export const DRAFT_KINDS = [
  { id: "referral", label: "Ask for a referral", stages: ["SAVED", "APPLIED", "SCREENING"] },
  { id: "follow_up", label: "Follow up", stages: ["APPLIED", "SCREENING", "INTERVIEWING"] },
  { id: "thank_you", label: "Thank-you", stages: ["SCREENING", "INTERVIEWING", "OFFER", "REJECTED"] },
  { id: "questions", label: "Questions to ask", stages: ["SCREENING", "INTERVIEWING"] },
  { id: "reschedule", label: "Reschedule", stages: ["INTERVIEWING"] },
  { id: "accept", label: "Accept the offer", stages: ["OFFER"] },
  { id: "decline", label: "Decline", stages: ["INTERVIEWING", "OFFER"] },
] as const;

export const RESUME_TEMPLATES = [
  { id: "executive", label: "Executive", detail: "Single column, serif name, room for a board-level summary." },
  { id: "atlas", label: "Atlas", detail: "Skills rail beside the roles. Still readable when printed." },
  { id: "ledger", label: "Ledger", detail: "Dense, linear, and the safest of the three for applicant tracking systems." },
] as const;

export const LETTER_TEMPLATES = [
  { id: "letterhead", label: "Letterhead" },
  { id: "plain", label: "Plain" },
  { id: "brief", label: "Brief" },
] as const;

export const POST_THEMES = ["Achievement", "Industry note", "Problem and fix", "Personal observation"] as const;

export const WORK_MODES = ["any", "remote", "hybrid", "onsite"] as const;

export function stageLabel(id: string) {
  return JOB_STAGES.find((stage) => stage.id === id)?.label ?? id;
}

export function draftsForStage(stage: string) {
  return DRAFT_KINDS.filter((kind) => (kind.stages as readonly string[]).includes(stage));
}

export function nextOutreachStep(current: string | null): OutreachStepId | null {
  const order = OUTREACH_STEPS.map((step) => step.id);
  if (!current) return order[0];
  const index = order.indexOf(current as OutreachStepId);
  if (index < 0) return order[0];
  return order[index + 1] ?? null;
}
