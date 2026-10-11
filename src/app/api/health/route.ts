import { aiMode } from "@/lib/ai";
import { stripeConfig } from "@/lib/billing/config";
import { emailMode } from "@/lib/email";

export function GET() {
  const stripe = stripeConfig();
  return Response.json({ ok: true, ai: aiMode(), payments: stripe.configured ? "configured" : "not_configured", webhook: stripe.webhookConfigured, email: emailMode(), name: "JobPilot AI" });
}
