"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rateMessage, sendAssistant } from "@/server/assistant-actions";
import { Button } from "@/components/ui/button";

type Message = { id: string; role: string; content: string; rating: number | null };

const general = [
  { label: "Plan my week", message: "What should I do this week?" },
  { label: "Find roles", message: "Find roles that match my niche" },
  { label: "Draft outreach", message: "Help me draft a referral note" },
];

const jobActions = [
  { intent: "cover", label: "Cover letter" },
  { intent: "fit", label: "Why this fits" },
  { intent: "ats", label: "ATS check" },
  { intent: "tailor", label: "Tailor resume" },
  { intent: "interview", label: "Practice interview" },
];

export function ChatPanel({
  initial,
  jobs,
  initialJobId,
}: {
  initial: Message[];
  jobs: { id: string; title: string; company: string }[];
  initialJobId?: string;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(body: { message: string; intent?: string }) {
    setError("");
    setPending(true);
    const optimistic = body.message || jobActions.find((item) => item.intent === body.intent)?.label || "Quick action";
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content: optimistic, rating: null }]);
    setText("");
    const result = await sendAssistant({ message: body.message, intent: body.intent, jobId: jobId || undefined, variant: messages.length });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMessages((current) => [...current, { id: result.data.id, role: "assistant", content: result.data.content, rating: null }]);
    router.refresh();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 border-b border-line px-4 py-3">
        <label className="block text-sm font-medium">
          Talking about a role?
          <select className="field mt-1" value={jobId} onChange={(event) => setJobId(event.target.value)} aria-label="Job context">
            <option value="">No specific role</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.company} — {job.title}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {general.map((item) => (
            <button key={item.label} className="rounded-full bg-mist px-3 py-2 text-sm font-medium text-indigo-deep" type="button" onClick={() => send({ message: item.message })}>
              {item.label}
            </button>
          ))}
          {jobId
            ? jobActions.map((item) => (
                <button key={item.intent} className="rounded-full bg-coral-soft px-3 py-2 text-sm font-medium text-coral" type="button" onClick={() => send({ message: "", intent: item.intent })}>
                  {item.label}
                </button>
              ))
            : null}
        </div>
      </div>
      <div data-testid="chat-log" className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? <p className="text-base text-muted">Ask what to do next. I will point you at one step.</p> : null}
        {messages.map((message) => (
          <article key={message.id} className={message.role === "user" ? "ml-8 rounded-3xl bg-indigo px-4 py-3 text-sm text-white" : "mr-6 rounded-3xl bg-canvas px-4 py-3 text-sm"}>
            <p className="whitespace-pre-wrap leading-6">{message.content}</p>
            {message.role === "assistant" ? (
              <div className="mt-2 flex gap-3 text-xs">
                <button type="button" className="font-medium text-indigo" onClick={() => navigator.clipboard.writeText(message.content)}>
                  Copy
                </button>
                <button type="button" className={message.rating === 1 ? "font-semibold text-teal" : "text-muted"} onClick={() => rateMessage(message.id, 1)}>
                  Useful
                </button>
                <button type="button" className={message.rating === -1 ? "font-semibold text-bad" : "text-muted"} onClick={() => rateMessage(message.id, -1)}>
                  Off
                </button>
              </div>
            ) : null}
          </article>
        ))}
        {pending ? <p className="text-sm text-muted">Working on it…</p> : null}
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </div>
      <form
        className="flex gap-2 border-t border-line p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send({ message: text });
        }}
      >
        <textarea
          data-testid="chat-input"
          className="field min-h-12 flex-1"
          value={text}
          placeholder="Ask what to do next"
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (text.trim()) send({ message: text });
            }
          }}
        />
        <Button data-testid="chat-send" type="submit" disabled={pending}>
          Send
        </Button>
      </form>
    </div>
  );
}
