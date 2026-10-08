"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { JobResult } from "@/lib/jobs/catalog";
import { WORK_MODES } from "@/lib/domain";
import { addManualJob, saveSearchedJob, searchMarket } from "@/server/pipeline-actions";

export function SearchPanel({ providers }: { providers: { id: string; name: string; configured: boolean; note: string }[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("Director platform");
  const [location, setLocation] = useState("");
  const [workMode, setWorkMode] = useState("any");
  const [experience, setExperience] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sample, setSample] = useState<JobResult[]>([]);
  const [live, setLive] = useState<JobResult[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [manual, setManual] = useState({ title: "", company: "", location: "", workMode: "remote", url: "", description: "" });

  async function search(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const result = await searchMarket({ title, location, workMode, experience, keywords });
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setSample(result.data.sample);
    setLive(result.data.live);
    setErrors(result.data.errors);
  }

  async function save(job: JobResult) {
    setPending(true);
    const result = await saveSearchedJob(job);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(result.data.existing ? "Already on the tracker." : "Saved to the tracker.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={search} className="desk-card grid gap-3 p-4 md:grid-cols-3">
        <label className="text-sm">Title<input className="field mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        <label className="text-sm">Location<input className="field mt-1" value={location} onChange={(event) => setLocation(event.target.value)} /></label>
        <label className="text-sm">
          Work mode
          <select className="field mt-1" value={workMode} onChange={(event) => setWorkMode(event.target.value)}>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>{mode}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">Minimum years<input className="field mt-1" value={experience} onChange={(event) => setExperience(event.target.value)} inputMode="numeric" /></label>
        <label className="text-sm md:col-span-2">Keywords<input className="field mt-1" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="kubernetes, finops" /></label>
        <div className="md:col-span-3">
          <Button type="submit" disabled={pending}>Search</Button>
        </div>
      </form>
      <ul className="flex flex-wrap gap-2 text-xs">
        {providers.map((provider) => (
          <li key={provider.id} className="rounded-full bg-paper px-3 py-1 text-muted">
            {provider.name}: {provider.configured ? "ready" : provider.note}
          </li>
        ))}
      </ul>
      {message ? <p className="text-sm text-pine">{message}</p> : null}
      {errors.map((item) => (
        <p key={item} className="text-sm text-bad">{item}</p>
      ))}
      <Results title="Sample market" jobs={sample} onSave={save} />
      {live.length ? <Results title="Live boards" jobs={live} onSave={save} /> : null}
      <form
        className="desk-card space-y-3 p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const result = await addManualJob(manual);
          setPending(false);
          if (!result.ok) {
            setMessage(result.error);
            return;
          }
          router.push(`/tracker/${result.data.id}`);
        }}
      >
        <h2 className="font-serif text-2xl">Add one role by hand</h2>
        <p className="text-sm text-muted">Paste a description or a single URL you already have. This is not a crawler.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="field" placeholder="Title" value={manual.title} onChange={(event) => setManual({ ...manual, title: event.target.value })} required />
          <input className="field" placeholder="Company" value={manual.company} onChange={(event) => setManual({ ...manual, company: event.target.value })} required />
          <input className="field" placeholder="Location" value={manual.location} onChange={(event) => setManual({ ...manual, location: event.target.value })} />
          <input className="field" placeholder="URL (optional)" value={manual.url} onChange={(event) => setManual({ ...manual, url: event.target.value })} />
        </div>
        <textarea className="field min-h-28" placeholder="Paste the job description" value={manual.description} onChange={(event) => setManual({ ...manual, description: event.target.value })} />
        <Button type="submit" disabled={pending}>Save to tracker</Button>
      </form>
    </div>
  );
}

function Results({ title, jobs, onSave }: { title: string; jobs: JobResult[]; onSave: (job: JobResult) => void }) {
  if (jobs.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 font-serif text-2xl">{title}</h2>
      <div className="grid gap-3">
        {jobs.map((job) => (
          <article key={job.externalId} className="desk-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{job.title}</h3>
                <p className="text-sm text-muted">{job.company} · {job.location} · {job.workMode} · {job.experience}</p>
                <p className="mt-2 text-sm leading-6">{job.description.slice(0, 280)}…</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => onSave(job)}>Save</Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
