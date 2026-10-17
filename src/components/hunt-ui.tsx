"use client";

import { useActionState, useState, useTransition } from "react";
import { addCompanyAction, runHuntAction } from "@/server/hunt-actions";

export function RunHuntButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-2">
      <button
        type="button"
        data-testid="run-hunt"
        disabled={pending}
        className="h-12 rounded-full bg-indigo px-6 font-bold text-white disabled:opacity-50"
        onClick={() => start(async () => {
          setMsg("");
          const r = await runHuntAction();
          setMsg(r.ok ? `Done: ${r.summary.companies} companies, ${r.summary.fetched} open roles fetched, ${r.summary.relevant} matched your titles, ${r.summary.fresh} new reviewed, ${r.summary.queued} queued, ${r.summary.skipped} skipped${r.summary.errors.length ? `, ${r.summary.errors.length} errors` : ""}.` : r.error);
        })}
      >
        {pending ? "Running… (up to a minute)" : "Run job hunt now"}
      </button>
      {msg ? <p role="status" data-testid="run-result" className="text-sm font-semibold">{msg}</p> : null}
    </div>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="rounded-full border-2 border-indigo px-3 py-1 text-xs font-bold text-indigo"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>
      {done ? "Copied" : label}
    </button>
  );
}

export function AddCompanyForm() {
  const [state, action, pending] = useActionState(addCompanyAction, null as { results: string[] } | null);
  return (
    <form action={action} className="space-y-2 text-sm">
      <div className="grid gap-2 sm:grid-cols-4">
        <input name="name" placeholder="Company name" className="rounded-xl border p-2" />
        <select name="ats" className="rounded-xl border p-2" defaultValue="greenhouse">
          <option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="smartrecruiters">SmartRecruiters</option>
        </select>
        <input name="token" placeholder="Board token (e.g. stripe)" className="rounded-xl border p-2" />
        <input name="industry" placeholder="Industry (optional)" className="rounded-xl border p-2" />
      </div>
      <textarea name="csv" rows={3} placeholder="…or paste CSV: name,ats,board_token,industry (one per line, up to 50 per import)" className="w-full rounded-xl border p-2" />
      <button disabled={pending} className="h-10 rounded-full bg-teal px-5 font-bold text-white disabled:opacity-50">{pending ? "Verifying boards…" : "Add / import"}</button>
      {state?.results.length ? <ul className="text-xs text-muted">{state.results.map((r) => <li key={r}>{r}</li>)}</ul> : null}
      <p className="text-xs text-muted">Each board is checked live before it is added; unreachable boards are rejected.</p>
    </form>
  );
}
