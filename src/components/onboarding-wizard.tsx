"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  addLocation, CITY_SUGGESTIONS, EMPLOYMENT_LABEL, EMPLOYMENT_TYPES, MAX_LOCATIONS, moveItem, STEPS, WORK_ARRANGEMENTS, WORK_LABEL,
  type PreferencesInput,
} from "@/lib/onboarding/preferences";
import { savePreferences } from "@/server/onboarding-actions";

const listFrom = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function OnboardingWizard({ initial, initialStep, resumes }: { initial: PreferencesInput; initialStep: number; resumes: { id: string; title: string }[] }) {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [p, setP] = useState(initial);
  const [city, setCity] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [uploaded, setUploaded] = useState(resumes);
  const set = <K extends keyof PreferencesInput>(k: K, v: PreferencesInput[K]) => setP((x) => ({ ...x, [k]: v }));

  async function go(next: number, complete = false) {
    setPending(true);
    setError("");
    const r = await savePreferences(p, complete ? STEPS.length : next, complete);
    setPending(false);
    if (!r.ok) return setError(r.error);
    if (complete) router.push("/dashboard");
    else setStep(next);
  }

  function addCity(v: string) {
    const r = addLocation(p.locations, v);
    if (r.error) setError(r.error);
    else setError("");
    set("locations", r.list);
    setCity("");
  }

  return (
    <div className="desk-card space-y-5 p-5" data-testid="onboarding">
      <ol className="flex flex-wrap gap-1 text-xs font-semibold" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={`rounded-full px-2 py-1 ${i === step ? "bg-sky text-white" : i < step ? "bg-mint-soft" : "bg-ink/5"}`}>
            {i + 1}. {s}
          </li>
        ))}
      </ol>
      <h1 className="text-2xl font-extrabold">{STEPS[step]}</h1>

      {step === 0 && (
        <div className="space-y-3">
          <p className="text-sm">Upload your resume (PDF, DOCX or TXT, under 4 MB). It is stored privately and only you can download it.</p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              const res = await fetch("/api/resumes/upload", { method: "POST", body: new FormData(e.currentTarget) });
              const body = (await res.json()) as { id?: string; error?: string };
              setPending(false);
              if (!res.ok || !body.id) return setError(body.error ?? "Upload failed");
              setUploaded((u) => [{ id: body.id!, title: "Uploaded resume" }, ...u]);
            }}
          >
            <input name="file" type="file" accept=".pdf,.docx,.txt" required aria-label="Resume file" />
            <Button type="submit" disabled={pending}>Upload</Button>
          </form>
          {uploaded.length > 0 && <p className="text-sm font-semibold">✓ {uploaded.length} resume(s) on file. You can review and edit them in Resumes.</p>}
          <p className="text-xs text-ink/60">You can skip this and upload later.</p>
        </div>
      )}

      {step === 1 && (
        <label className="block text-sm font-semibold">
          Roles you are targeting (comma-separated, up to 5)
          <input className="mt-1 w-full rounded-xl border p-2" defaultValue={p.targetRoles.join(", ")} onChange={(e) => set("targetRoles", listFrom(e.target.value).slice(0, 5))} />
        </label>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm">Add up to {MAX_LOCATIONS} cities in order of preference. Use the arrows to reorder.</p>
          <div className="flex gap-2">
            <input list="cities" className="flex-1 rounded-xl border p-2" value={city} placeholder="Type a city" aria-label="City"
              onChange={(e) => setCity(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCity(city); } }} />
            <datalist id="cities">{CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            <Button type="button" onClick={() => addCity(city)} disabled={p.locations.length >= MAX_LOCATIONS}>Add</Button>
          </div>
          <ul className="flex flex-wrap gap-2" data-testid="location-chips">
            {p.locations.map((l, i) => (
              <li key={l} className="flex items-center gap-1 rounded-full bg-sun-soft px-3 py-1 text-sm font-semibold">
                <span>{i + 1}. {l}</span>
                <button type="button" aria-label={`Move ${l} earlier`} disabled={i === 0} onClick={() => set("locations", moveItem(p.locations, i, i - 1))}>◀</button>
                <button type="button" aria-label={`Move ${l} later`} disabled={i === p.locations.length - 1} onClick={() => set("locations", moveItem(p.locations, i, i + 1))}>▶</button>
                <button type="button" aria-label={`Remove ${l}`} onClick={() => set("locations", p.locations.filter((x) => x !== l))}>✕</button>
              </li>
            ))}
          </ul>
          <p className="text-xs">{p.locations.length}/{MAX_LOCATIONS} cities</p>
          <fieldset className="space-y-1">
            <legend className="text-sm font-semibold">Remote options (separate from cities)</legend>
            <label className="flex gap-2"><input type="checkbox" checked={p.remoteIndia} onChange={(e) => set("remoteIndia", e.target.checked)} /> Remote within India</label>
            <label className="flex gap-2"><input type="checkbox" checked={p.remoteInternational} onChange={(e) => set("remoteInternational", e.target.checked)} /> Remote for international employers</label>
            <label className="flex gap-2"><input type="checkbox" checked={p.willingToRelocate} onChange={(e) => set("willingToRelocate", e.target.checked)} /> Willing to relocate</label>
          </fieldset>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-semibold">Work arrangement (choose any)</legend>
            {WORK_ARRANGEMENTS.map((w) => (
              <label key={w} className="flex gap-2"><input type="checkbox" checked={p.workArrangements.includes(w)} onChange={() => set("workArrangements", toggle(p.workArrangements, w))} /> {WORK_LABEL[w]}</label>
            ))}
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold">Employment type (choose any)</legend>
            {EMPLOYMENT_TYPES.map((w) => (
              <label key={w} className="flex gap-2"><input type="checkbox" checked={p.employmentTypes.includes(w)} onChange={() => set("employmentTypes", toggle(p.employmentTypes, w))} /> {EMPLOYMENT_LABEL[w]}</label>
            ))}
          </fieldset>
        </div>
      )}

      {step === 4 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {([["experienceYears", "Years of experience"], ["currentCtcLakhs", "Current CTC (₹ lakhs/yr, optional)"], ["expectedCtcLakhs", "Expected CTC (₹ lakhs/yr, optional)"], ["noticePeriodDays", "Notice period (days, optional)"]] as const).map(([k, label]) => (
            <label key={k} className="text-sm font-semibold">{label}
              <input type="number" min={0} className="mt-1 w-full rounded-xl border p-2" value={p[k] ?? ""} onChange={(e) => set(k, (e.target.value === "" ? (k === "experienceYears" ? 0 : null) : Number(e.target.value)) as never)} />
            </label>
          ))}
          <p className="text-xs text-ink/60 sm:col-span-2">Used only to filter and explain matches. Never shared with employers.</p>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-3">
          <label className="block text-sm font-semibold">Key skills (comma-separated)
            <input className="mt-1 w-full rounded-xl border p-2" defaultValue={p.skills.join(", ")} onChange={(e) => set("skills", listFrom(e.target.value).slice(0, 40))} /></label>
          <label className="block text-sm font-semibold">Preferred industries (comma-separated)
            <input className="mt-1 w-full rounded-xl border p-2" defaultValue={p.industries.join(", ")} onChange={(e) => set("industries", listFrom(e.target.value).slice(0, 10))} /></label>
        </div>
      )}

      {step === 6 && (
        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm" data-testid="review">
          <dt className="font-semibold">Roles</dt><dd>{p.targetRoles.join(", ") || "—"}</dd>
          <dt className="font-semibold">Cities</dt><dd>{p.locations.join(" → ") || "—"}</dd>
          <dt className="font-semibold">Remote</dt><dd>{[p.remoteIndia && "India", p.remoteInternational && "International"].filter(Boolean).join(", ") || "No"}</dd>
          <dt className="font-semibold">Work</dt><dd>{p.workArrangements.map((w) => WORK_LABEL[w as keyof typeof WORK_LABEL]).join(", ") || "—"}</dd>
          <dt className="font-semibold">Type</dt><dd>{p.employmentTypes.map((w) => EMPLOYMENT_LABEL[w as keyof typeof EMPLOYMENT_LABEL]).join(", ") || "—"}</dd>
          <dt className="font-semibold">Experience</dt><dd>{p.experienceYears} yrs</dd>
          <dt className="font-semibold">Skills</dt><dd>{p.skills.join(", ") || "—"}</dd>
          <dt className="font-semibold">Industries</dt><dd data-testid="review-industries">{p.industries.join(", ") || "—"}</dd>
        </dl>
      )}

      {error && <p role="alert" className="rounded-xl bg-coral-soft p-2 text-sm font-semibold">{error}</p>}
      <div className="flex justify-between">
        <Button type="button" variant="outline" disabled={step === 0 || pending} onClick={() => setStep(step - 1)}>Back</Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" disabled={pending} onClick={() => go(step + 1)}>Continue</Button>
        ) : (
          <Button type="button" disabled={pending} onClick={() => go(step, true)}>Finish</Button>
        )}
      </div>
    </div>
  );
}
