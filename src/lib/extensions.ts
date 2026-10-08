/**
 * Extension points that are intentionally unwired.
 * Payments, a browser extension, LinkedIn sending, live video analysis,
 * and human coaching can plug in behind these flags later.
 */
export const extensions = {
  payments: {
    enabled: false,
    note: "No billing provider is connected. A future checkout can sit behind src/lib/extensions.ts without touching the desk modules.",
  },
  browserExtension: {
    enabled: false,
    importPath: "/api/extensions/jobs",
    note: "POST a single job payload here when an extension exists. The route currently answers 501.",
  },
  linkedinSend: {
    enabled: false,
    reason: "Outreach is draft-only. JobPilot never sends connection notes or messages.",
  },
  videoAnalysis: {
    enabled: false,
    note: "Mock interviews score typed or spoken answers. Camera and body-language analysis are not implemented.",
  },
  humanCoaching: {
    enabled: false,
    note: "No coach scheduling. The desk is self-serve.",
  },
} as const;

export const OUTREACH_STATUSES = ["DRAFT", "COPIED"] as const;
export type OutreachStatus = (typeof OUTREACH_STATUSES)[number];
