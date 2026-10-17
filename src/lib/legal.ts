/** Central operator/legal config. Every value has a neutral, real fallback — never a bracketed placeholder. */
const v = (k: string) => process.env[k]?.trim() || "";

export function legalConfig() {
  const days = Number.parseInt(v("BACKUP_RETENTION_DAYS"), 10);
  return {
    entity: v("LEGAL_ENTITY_NAME") || "JobPilot AI",
    supportEmail: v("SUPPORT_EMAIL") || null,
    grievanceName: v("GRIEVANCE_OFFICER_NAME") || null,
    grievanceEmail: v("GRIEVANCE_OFFICER_EMAIL") || v("SUPPORT_EMAIL") || null,
    effectiveDate: v("LEGAL_EFFECTIVE_DATE") || "17 October 2026",
    aiProvider: v("AI_PROVIDER_NAME") || null,
    aiLive: Boolean(v("LLM_API_KEY")) && v("LLM_MOCK") !== "1",
    backupDays: Number.isFinite(days) && days > 0 ? days : null,
    jurisdiction: v("LEGAL_JURISDICTION_CITY") || "India",
  };
}

/** Human contact line: email when configured, otherwise the in-app support page. */
export function contactText(email: string | null) {
  return email ? `${email} or the Support page (/support)` : "the Support page (/support)";
}
