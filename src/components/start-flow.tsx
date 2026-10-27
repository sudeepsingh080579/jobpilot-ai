"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useCallback, useRef, useState } from "react";
import { Check, FileText, Loader2, UploadCloud } from "lucide-react";

type Score = { score: number; checks: { id: string; group: string; label: string; points: number; max: number; detail: string }[]; keywordsPresent: string[]; keywordsAbsent: string[] };
type Preview = {
  resumeId: string;
  saved: { id: string; version: number } | null;
  family: { id: string; label: string; titles: string[] };
  roles: { suggested: { id: string; label: string; match: number }[]; others: { id: string; label: string }[] };
  before: Score; after: Score;
  originalText: string; enhancedText: string;
  changes: { section: string; kind: string; before: string; after: string }[]; changeCount: number;
  suggestions: { kind: string; text: string }[];
  coverage: number; novelWords: string[];
  skills: string[]; latestTitles: string[]; location: string;
};
type Step = "upload" | "account" | "analyzing" | "compare" | "roles" | "done";

const ANALYSIS = ["Reading your file", "Finding sections and contact details", "Checking ATS layout rules", "Scoring against role keywords", "Rewording bullets from your own facts", "Verifying nothing was invented"];
const LOCATION_HINTS = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Chennai", "India", "United Arab Emirates", "United Kingdom", "Germany", "Netherlands"];

function Ring({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto grid size-28 place-items-center rounded-full" style={{ background: `conic-gradient(${tone} ${value * 3.6}deg, #e8e6f2 0)` }}>
        <div className="grid size-20 place-items-center rounded-full bg-white"><span className="text-3xl font-bold" data-testid={`score-${label.toLowerCase()}`}>{value}</span></div>
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
    </div>
  );
}

async function json(res: Response) {
  try { return await res.json(); } catch { return {}; }
}

export function StartFlow({ signedIn }: { signedIn: boolean }) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authed, setAuthed] = useState(signedIn);
  const [tick, setTick] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [familyId, setFamilyId] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [customRole, setCustomRole] = useState("");
  const [locations, setLocations] = useState("");
  const [remote, setRemote] = useState(true);
  const [remoteAbroad, setRemoteAbroad] = useState(true);
  const [days, setDays] = useState(3);
  const [account, setAccount] = useState({ name: "", email: "", password: "", accept: false });
  const [refreshing, setRefreshing] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const pick = (f: File | null | undefined) => {
    setError("");
    if (!f) return;
    if (!/\.(pdf|docx|txt)$/i.test(f.name)) return setError("Upload a PDF, DOCX or TXT file.");
    if (f.size > 4 * 1024 * 1024) return setError("That file is over 4 MB. Export a smaller PDF.");
    setFile(f);
  };

  const analyze = useCallback(async (f: File) => {
    setStep("analyzing"); setError(""); setTick(0);
    const timer = setInterval(() => setTick((t) => Math.min(t + 1, ANALYSIS.length - 1)), 900);
    try {
      const body = new FormData(); body.append("file", f);
      const up = await fetch("/api/resumes/upload", { method: "POST", body });
      const upJson = await json(up);
      if (!up.ok || !upJson.id) throw new Error(upJson.error || "Upload failed.");
      const en = await fetch(`/api/resumes/${upJson.id}/enhance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ save: false }) });
      const enJson = await json(en);
      if (!en.ok) throw new Error(enJson.error || "Could not analyze that resume.");
      await new Promise((r) => setTimeout(r, 1500));
      const p = enJson as Preview;
      setPreview(p); setFamilyId(p.family.id); setRoles(p.latestTitles.length && p.family.id === "general" ? p.latestTitles.slice(0, 1) : p.family.titles.slice(0, 2));
      setLocations(p.location || "");
      setTick(ANALYSIS.length);
      setStep("compare");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("upload");
    } finally { clearInterval(timer); }
  }, []);

  const onContinue = () => {
    if (!file) return setError("Choose your resume first.");
    if (authed) void analyze(file); else setStep("account");
  };

  const register = async () => {
    setError("");
    if (!account.accept) return setError("Please accept the Terms and Privacy Policy.");
    setBusy(true);
    try {
      const res = await fetch("/api/start/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: account.name, email: account.email, password: account.password, accept: true }) });
      const data = await json(res);
      if (!res.ok) { setError(data.error || "Could not create the account."); return; }
      const si = await signIn("credentials", { email: account.email.toLowerCase(), password: account.password, redirect: false });
      if (si?.error) { setError("Account created, but sign-in failed. Please sign in from the login page."); return; }
      setAuthed(true);
      if (file) void analyze(file);
    } finally { setBusy(false); }
  };

  const changeFamily = async (id: string) => {
    if (!preview || id === familyId) return;
    setRefreshing(true); setError("");
    try {
      const res = await fetch(`/api/resumes/${preview.resumeId}/enhance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyId: id, save: false }) });
      const data = await json(res);
      if (!res.ok) throw new Error(data.error || "Could not re-score.");
      const p = data as Preview;
      setPreview(p); setFamilyId(p.family.id); setRoles(p.family.titles.slice(0, 2));
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setRefreshing(false); }
  };

  const toggleRole = (t: string) => setRoles((r) => (r.includes(t) ? r.filter((x) => x !== t) : [...r, t].slice(0, 8)));
  const addCustom = () => { const t = customRole.trim(); if (t.length >= 2) { setRoles((r) => [...new Set([...r, t])].slice(0, 8)); setCustomRole(""); } };

  const save = async () => {
    if (!preview) return;
    const all = [...new Set([...roles, ...(customRole.trim().length >= 2 ? [customRole.trim()] : [])])];
    if (!all.length) return setError("Pick at least one target role.");
    setBusy(true); setError("");
    try {
      const en = await fetch(`/api/resumes/${preview.resumeId}/enhance`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ familyId, save: true }) });
      const enJson = await json(en);
      if (!en.ok || !enJson.saved) throw new Error(enJson.error || "Could not save the enhanced resume.");
      const fin = await fetch("/api/start/finish", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ roles: all, locations: locations.split(",").map((s) => s.trim()).filter(Boolean), remote, remoteAbroad, hybridAbroad: false, freshnessDays: days, skills: preview.skills }),
      });
      const finJson = await json(fin);
      if (!fin.ok) throw new Error(finJson.error || "Could not save your preferences.");
      setPreview(enJson as Preview); setStep("done");
    } catch (e) { setError(e instanceof Error ? e.message : "Failed."); } finally { setBusy(false); }
  };

  const changed = new Set((preview?.changes ?? []).map((c) => c.after.trim()).filter(Boolean));
  const errorBox = (error ? <p role="alert" data-testid="start-error" className="rounded-xl bg-coral-soft px-4 py-2 text-sm font-semibold">{error}</p> : null);
  const labels: [Step, string][] = [["upload", "Upload"], ["account", "Account"], ["analyzing", "Analyze"], ["compare", "Before / after"], ["roles", "Target roles"], ["done", "Download"]];
  const idx = labels.findIndex(([s]) => s === step);

  return (
    <div className="space-y-6" data-testid="start-flow">
      <div className="rounded-[2rem] bg-gradient-to-br from-indigo via-violet to-indigo-deep px-6 py-10 text-center text-white">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold leading-tight sm:text-5xl" data-testid="start-headline">Upload your resume. See how an ATS reads it.</h1>
        <p className="mx-auto mt-3 max-w-xl text-white/85">We rebuild it in a clean, single-column format using only what&apos;s already in your resume, show the score before and after, and give you a PDF and DOCX.</p>
      </div>
      <ol className="flex flex-wrap justify-center gap-2 text-xs font-semibold">
        {labels.map(([s, l], i) => (i === 1 && signedIn ? null : <li key={s} className={`rounded-full px-3 py-1 ${i === idx ? "bg-indigo text-white" : i < idx ? "bg-teal text-white" : "bg-white text-muted"}`}>{i + 1}. {l}</li>))}
      </ol>
      {errorBox}

      {step === "upload" ? (
        <section className="desk-card space-y-4 p-6 text-center">
          <div
            data-testid="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
            onClick={() => input.current?.click()}
            className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo/40 bg-white p-10 hover:bg-sun-soft"
          >
            <UploadCloud className="mx-auto size-10 text-indigo" />
            <p className="mt-2 text-lg font-bold">{file ? file.name : "Drop your resume here, or click to choose"}</p>
            <p className="text-sm text-muted">PDF, DOCX or TXT, up to 4 MB. Your original file is kept unchanged.</p>
            <input ref={input} data-testid="resume-file" type="file" accept=".pdf,.docx,.txt" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          <button data-testid="start-continue" onClick={onContinue} disabled={!file} className="h-14 rounded-full bg-sun px-10 text-lg font-bold text-ink disabled:opacity-50">
            {authed ? "Analyze my resume" : "Continue"}
          </button>
          {!authed ? <p className="text-xs text-muted">Free to start. Already have an account? <Link href="/login?next=/start" className="font-semibold text-indigo underline">Sign in</Link></p> : null}
        </section>
      ) : null}

      {step === "account" ? (
        <section className="desk-card mx-auto max-w-md space-y-3 p-6" data-testid="account-step">
          <h2 className="text-xl font-bold">Create your free account</h2>
          <p className="text-sm text-muted">So your versions and downloads are saved to you, and only you. Includes a 7-day trial; no card needed.</p>
          <label className="block text-sm font-semibold">Name<input data-testid="acc-name" autoComplete="name" value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Email<input data-testid="acc-email" type="email" autoComplete="email" value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="block text-sm font-semibold">Password (8+ characters)<input data-testid="acc-password" type="password" autoComplete="new-password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} className="mt-1 w-full rounded-xl border p-3 font-normal" /></label>
          <label className="flex gap-2 text-xs"><input data-testid="acc-accept" type="checkbox" checked={account.accept} onChange={(e) => setAccount({ ...account, accept: e.target.checked })} /> <span>I agree to the <Link href="/terms" target="_blank" className="underline">Terms</Link> and <Link href="/privacy" target="_blank" className="underline">Privacy Policy</Link>, and consent to my resume being processed to provide this service.</span></label>
          <div className="flex gap-2">
            <button onClick={() => setStep("upload")} className="h-12 rounded-full border-2 border-line px-5 font-bold">Back</button>
            <button data-testid="acc-submit" disabled={busy} onClick={register} className="h-12 flex-1 rounded-full bg-indigo px-6 font-bold text-white disabled:opacity-50">{busy ? "Creating…" : "Create account & analyze"}</button>
          </div>
        </section>
      ) : null}

      {step === "analyzing" ? (
        <section className="desk-card mx-auto max-w-md space-y-3 p-6" data-testid="analyzing">
          <h2 className="text-xl font-bold">Analyzing your resume…</h2>
          <ul className="space-y-2 text-sm">
            {ANALYSIS.map((a, i) => (
              <li key={a} className={`flex items-center gap-2 ${i > tick ? "text-muted" : "font-semibold"}`}>
                {i < tick ? <Check className="size-4 text-teal" /> : i === tick ? <Loader2 className="size-4 animate-spin text-indigo" /> : <span className="size-4" />}
                {a}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {step === "compare" && preview ? (
        <section className="space-y-4" data-testid="compare">
          <div className="desk-card grid items-center gap-6 p-6 sm:grid-cols-[1fr,1fr,2fr]">
            <Ring value={preview.before.score} label="Before" tone="#f4694c" />
            <Ring value={preview.after.score} label="After" tone="#14a39a" />
            <div className="space-y-2 text-sm">
              <p className="text-lg font-bold">ATS score {preview.before.score} → {preview.after.score} <span className="text-xs font-normal text-muted">(out of 100, rule-based)</span></p>
              <p className="text-muted">{preview.changeCount} wording and structure changes. {preview.coverage}% of your original wording is kept.{preview.novelWords.length ? ` Check these words: ${preview.novelWords.join(", ")}.` : " Nothing was added that was not in your resume."}</p>
              <p className="text-xs text-muted">Scored for target: <strong>{preview.family.label}</strong>. You choose the role next and the keyword score updates.</p>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="desk-card p-4"><h3 className="mb-2 font-bold text-coral">Before: your original text</h3><pre data-testid="before-text" className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{preview.originalText}</pre></div>
            <div className="desk-card p-4"><h3 className="mb-2 font-bold text-teal">After: ATS-compliant</h3>
              <pre data-testid="after-text" className="max-h-96 overflow-auto whitespace-pre-wrap text-xs">{preview.enhancedText.split("\n").map((l, i) => (changed.has(l.replace(/^[•\-*]\s*/, "").trim()) || changed.has(l.trim()) ? <mark key={i} className="bg-sun-soft">{l + "\n"}</mark> : l + "\n"))}</pre>
            </div>
          </div>
          {preview.suggestions.length ? (
            <div className="rounded-3xl bg-sun-soft p-5 text-sm" data-testid="suggestions">
              <h3 className="font-bold">Still yours to add (we never invent these)</h3>
              <ul className="mt-1 list-disc space-y-1 pl-5">{preview.suggestions.slice(0, 8).map((s) => <li key={s.text}>{s.text}</li>)}</ul>
            </div>
          ) : null}
          <button data-testid="to-roles" onClick={() => setStep("roles")} className="h-14 rounded-full bg-indigo px-10 text-lg font-bold text-white">Choose my target roles</button>
        </section>
      ) : null}

      {step === "roles" && preview ? (
        <section className="desk-card space-y-5 p-6" data-testid="roles-step">
          <h2 className="text-xl font-bold">What are you aiming for?</h2>
          <div>
            <p className="mb-2 text-sm font-semibold">Role family (sets which keywords we check and align to)</p>
            <div className="flex flex-wrap gap-2">
              {[...preview.roles.suggested.map((r) => ({ id: r.id, label: `${r.label} · ${r.match}% fit` })), ...preview.roles.others].map((r) => (
                <button key={r.id} disabled={refreshing} onClick={() => changeFamily(r.id)} data-testid={`family-${r.id}`} className={`rounded-full border-2 px-4 py-2 text-sm font-semibold ${r.id === familyId ? "border-indigo bg-indigo text-white" : "border-line bg-white"}`}>{r.label}</button>
              ))}
            </div>
            <p className="mt-2 text-sm" data-testid="score-live">ATS score for <strong>{preview.family.label}</strong>: {preview.before.score} → <strong>{preview.after.score}</strong>{refreshing ? " (updating…)" : ""}</p>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold">Job titles to search</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...preview.family.titles, ...roles])].map((t) => (
                <button key={t} onClick={() => toggleRole(t)} className={`rounded-full border-2 px-3 py-1 text-sm ${roles.includes(t) ? "border-teal bg-teal text-white" : "border-line bg-white"}`}>{t}</button>
              ))}
            </div>
            <div className="mt-2 flex gap-2"><input value={customRole} onChange={(e) => setCustomRole(e.target.value)} placeholder="Add another title" className="flex-1 rounded-xl border p-2 text-sm" /><button onClick={addCustom} className="rounded-full border-2 border-indigo px-4 text-sm font-bold text-indigo">Add</button></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Where do you want to work? (cities or countries, comma-separated)
              <input data-testid="locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Bengaluru, Hyderabad" className="mt-1 w-full rounded-xl border p-2 font-normal" />
              <span className="mt-1 block text-xs font-normal text-muted">e.g. {LOCATION_HINTS.slice(0, 5).join(", ")}. Onsite roles are only shown in the places you list.</span>
            </label>
            <label className="text-sm font-semibold">Only jobs posted in the last (days)
              <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(Math.min(30, Math.max(1, Number(e.target.value) || 3)))} className="mt-1 w-full rounded-xl border p-2 font-normal" />
            </label>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex gap-2"><input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} /> Include remote roles in my country</label>
            <label className="flex gap-2"><input type="checkbox" checked={remoteAbroad} onChange={(e) => setRemoteAbroad(e.target.checked)} /> Include remote roles abroad</label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep("compare")} className="h-12 rounded-full border-2 border-line px-5 font-bold">Back</button>
            <button data-testid="save-roles" disabled={busy || refreshing} onClick={save} className="h-12 flex-1 rounded-full bg-indigo px-6 font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save my enhanced resume"}</button>
          </div>
        </section>
      ) : null}

      {step === "done" && preview?.saved ? (
        <section className="desk-card space-y-4 p-6" data-testid="done-step">
          <h2 className="text-2xl font-bold">Your ATS-ready resume is saved (v{preview.saved.version})</h2>
          <p className="text-sm">ATS score <strong>{preview.before.score} → {preview.after.score}</strong> for {preview.family.label}. Single column, standard headings, real selectable text: no tables, columns, images or text boxes.</p>
          <div className="flex flex-wrap gap-3">
            <a data-testid="dl-pdf" href={`/api/resumes/versions/${preview.saved.id}/download?format=pdf`} className="inline-flex h-12 items-center gap-2 rounded-full bg-sun px-6 font-bold text-ink"><FileText className="size-4" /> Download PDF</a>
            <a data-testid="dl-docx" href={`/api/resumes/versions/${preview.saved.id}/download?format=docx`} className="inline-flex h-12 items-center gap-2 rounded-full bg-sun px-6 font-bold text-ink"><FileText className="size-4" /> Download DOCX</a>
          </div>
          <div className="rounded-3xl bg-sun-soft p-5 text-sm">
            <p className="font-bold">Next: let JobPilot find jobs for you</p>
            <p className="text-muted">It scans verified employer career pages for roles posted in the last {days} day{days === 1 ? "" : "s"} in your locations, scores them against this resume, and prepares a tailored version and answers for each good match. It never submits applications for you.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/hunt?run=1" data-testid="find-jobs" className="inline-flex h-12 items-center rounded-full bg-indigo px-6 font-bold text-white">Find jobs now</Link>
              <Link href="/hunt" className="inline-flex h-12 items-center rounded-full border-2 border-indigo px-6 font-bold text-indigo">Set up daily runs</Link>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
