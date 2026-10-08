import { aiMode } from "@/lib/ai";

export function GET() {
  return Response.json({ ok: true, ai: aiMode(), name: "JobPilot AI" });
}
