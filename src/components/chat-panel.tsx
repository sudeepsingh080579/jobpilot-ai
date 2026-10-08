"use client";

import { useMemo, useState } from "react";
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
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((message) => message.content.toLowerCase().includes(q));
  }, [messages, query]);

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
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <aside className="desk-card h-fit p-3">
        <label className="block text-xs text-muted">
          Job context
          <select className="field mt-1" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            <option value="">No specific role</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.company} — {job.title}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-3 flex flex-col gap-2">
          {general.map((item) => (
            <button key={item.label} className="rounded-lg border border-line px-3 py-2 text-left text-sm" type="button" onClick={() => send({ message: item.message })}>
              {item.label}
            </button>
          ))}
        </div>
        {jobId ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs uppercase tracking-[0.14em] text-brass">For this role</p>
            {jobActions.map((item) => (
              <button key={item.intent} className="w-full rounded-lg bg-mist px-3 py-2 text-left text-sm text-pine" type="button" onClick={() => send({ message: "", intent: item.intent })}>
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted">Choose a saved role to unlock cover letter, fit, ATS, tailor, and interview actions.</p>
        )}
      </aside>
      <section className="desk-card flex min-h-[70vh] flex-col">
        <div className="border-b border-line p-3">
          <input className="field" placeholder="Search this conversation" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search conversation" />
        </div>
        <div data-testid="chat-log" className="flex-1 space-y-3 overflow-y-auto p-4">
          {visible.length === 0 ? <p className="text-sm text-muted">Ask for the week’s plan, or pick a role and run a quick action.</p> : null}
          {visible.map((message) => (
            <article key={message.id} className={message.role === "user" ? "ml-8 rounded-2xl bg-pine px-4 py-3 text-sm text-cream" : "mr-8 rounded-2xl bg-cream px-4 py-3 text-sm"}>
              <p className="whitespace-pre-wrap leading-6">{message.content}</p>
              {message.role === "assistant" ? (
                <div className="mt-2 flex gap-2 text-xs">
                  <button type="button" className="text-muted" onClick={() => navigator.clipboard.writeText(message.content)}>
                    Copy
                  </button>
                  <button type="button" className={message.rating === 1 ? "text-pine" : "text-muted"} onClick={() => rateMessage(message.id, 1)}>
                    Useful
                  </button>
                  <button type="button" className={message.rating === -1 ? "text-bad" : "text-muted"} onClick={() => rateMessage(message.id, -1)}>
                    Off
                  </button>
                </div>
              ) : null}
            </article>
          ))}
          {pending ? <p className="text-sm text-muted">Working…</p> : null}
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
            className="field min-h-11 flex-1"
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
      </section>
    </div>
  );
}
