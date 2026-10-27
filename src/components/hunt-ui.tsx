"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { addCompanyAction, runHuntAction } from "@/server/hunt-actions";

export function RunHuntButton({ autoStart = false }: { autoStart?: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const began = useRef(false);
  const run = () => start(async () => {
    setMsg("");
    const r = await runHuntAction();
    if (!r.ok) { setMsg(r.error); return; }
    const s = r.summary;
    setMsg(`Done: ${s.companies} employer boards checked, ${s.fetched} open roles read. ${s.stale} were older than your freshness window and ${s.undated} had no posting date (excluded). ${s.fresh} new fresh roles reviewed: ${s.queued} queued, ${s.skipped} skipped (${s.locationSkipped} outside your locations).${s.partial ? " Stopped at the time limit; the rest will be covered next run." : ""}${s.errors.length ? ` ${s.errors.length} fetch errors.` : ""}`);
  });
  useEffect(() => {
    if (autoStart && !began.current) { began.current = true; run(); }
  }, [autoStart]);
  return (
    <div className="space-y-2">
      <button type="button" data-testid="run-hunt" disabled={pending} className="h-12 rounded-full bg-indigo px-6 font-bold text-white disabled:opacity-50" onClick={run}>
        {pending ? "Scanning career pages… (up to ~4 minutes)" : "Run job hunt now"}
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
          <option value="greenhouse">Greenhouse</option><option value="lever">Lever</option><option value="ashby">Ashby</option><option value="smartrecruiters">SmartRecruiters</option><option value="workday">Workday (tenant|wdN|site)</option>
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
