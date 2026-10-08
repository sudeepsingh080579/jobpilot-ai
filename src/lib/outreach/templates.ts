import type { OutreachStepId } from "@/lib/domain";

export const DEFAULT_TEMPLATES: { step: OutreachStepId; name: string; body: string }[] = [
  {
    step: "PITCH",
    name: "Pitch",
    body: "Hi {{firstName}} — I am {{myName}}, a {{role}} looking at a conversation with {{company}}. I will not ask for a call in this note. If you are close to the hiring manager, I can send a five-line brief. If someone else is the better pointer, that is just as useful.",
  },
  {
    step: "FOLLOW_UP_1",
    name: "Follow-up 1",
    body: "Hi {{firstName}} — a short follow-up on {{company}}. One specific thing I keep seeing in this kind of platform seat: {{hook}}. If a pointer is easy, I will take it. If not, I will not keep nudging.",
  },
  {
    step: "FOLLOW_UP_2",
    name: "Follow-up 2",
    body: "Hi {{firstName}} — last note from me for a bit. I wrote a one-page view of how I would spend the first 90 days in a {{role}} seat at {{company}}. Happy to send it. Either way, thank you for reading.",
  },
  {
    step: "FINAL",
    name: "Final",
    body: "Hi {{firstName}} — I am closing the loop on {{company}}. I will not write again. If timing changes later, my note above still stands. Wishing you a calm quarter.",
  },
];

export function fillTemplate(body: string, vars: Record<string, string>) {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}
