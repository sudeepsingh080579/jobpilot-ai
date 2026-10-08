import { mockAi } from "@/lib/ai/mock";
import { AI_TASKS, type AiResult, type AiTask } from "@/lib/ai/types";

export function aiMode(): "mock" | "live" {
  if (process.env.LLM_MOCK === "1") return "mock";
  return process.env.LLM_API_KEY?.trim() ? "live" : "mock";
}

function endpoint() {
  const base = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  return `${base}/chat/completions`;
}

function isTask(value: string): value is AiTask {
  return (AI_TASKS as readonly string[]).includes(value);
}

export async function completeJson<T>(task: AiTask, input: unknown): Promise<AiResult<T>> {
  if (!isTask(task)) throw new Error(`Unknown AI task: ${task}`);
  if (aiMode() === "mock") {
    return { data: mockAi(task, input) as T, mode: "mock", task };
  }

  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.LLM_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are the writing desk inside a job-search product for senior professionals. Task: ${task}. Reply with one JSON object only. No markdown. Use the user's facts. Do not invent employers, degrees, or metrics they did not provide. Outreach must be a draft the user sends themselves.`,
        },
        { role: "user", content: JSON.stringify({ task, input }) },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`The model request failed (${response.status}). ${detail.slice(0, 180)}`);
  }
  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model returned an empty response.");
  return { data: JSON.parse(content) as T, mode: "live", task };
}
