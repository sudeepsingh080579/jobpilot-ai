"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JOB_STAGES } from "@/lib/domain";
import { updateJob } from "@/server/pipeline-actions";
import { useRun } from "@/components/use-run";

export type TrackerCard = {
  id: string;
  title: string;
  company: string;
  location: string;
  status: string;
  fitScore: number | null;
  fitBand: string;
  workMode: string;
};

export function TrackerBoard({ jobs }: { jobs: TrackerCard[] }) {
  const { error, pending, run } = useRun();
  const [hideRejected, setHideRejected] = useState(false);
  const tones: Record<string, string> = {
    SAVED: "bg-sun-soft",
    APPLIED: "bg-teal-soft",
    SCREENING: "bg-mist",
    INTERVIEWING: "bg-violet/15",
    OFFER: "bg-coral-soft",
    REJECTED: "bg-canvas",
  };
  const dots: Record<string, string> = {
    SAVED: "bg-sun",
    APPLIED: "bg-teal",
    SCREENING: "bg-indigo",
    INTERVIEWING: "bg-violet",
    OFFER: "bg-coral",
    REJECTED: "bg-muted",
  };
  const visible = useMemo(() => jobs.filter((job) => (hideRejected ? job.status !== "REJECTED" : true)), [jobs, hideRejected]);

  function move(id: string, status: string) {
    run(() => updateJob({ id, status }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-muted">
          <input type="checkbox" checked={hideRejected} onChange={(event) => setHideRejected(event.target.checked)} />
          Hide rejected
        </label>
        {pending ? <span className="text-sm text-muted">Saving…</span> : null}
        {error ? <span className="text-sm text-bad">{error}</span> : null}
      </div>
      {jobs.length === 0 ? (
        <div className="desk-card px-6 py-12 text-center">
          <h2 className="text-2xl font-bold">No roles yet</h2>
          <p className="mt-2 text-base text-muted">Add one role you already care about.</p>
          <Link className="mt-5 inline-flex h-12 items-center rounded-full bg-indigo px-6 font-bold text-white" href="/search">
            Find a role
          </Link>
        </div>
      ) : (
        <div data-testid="tracker-board" className="flex gap-3 overflow-x-auto pb-3">
          {JOB_STAGES.filter((stage) => (hideRejected ? stage.id !== "REJECTED" : true)).map((stage) => {
            const cards = visible.filter((job) => job.status === stage.id);
            return (
              <section
                key={stage.id}
                className={`w-72 shrink-0 rounded-3xl p-3 ${tones[stage.id] ?? "bg-canvas"}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const id = event.dataTransfer.getData("text/plain");
                  if (id) move(id, stage.id);
                }}
              >
                <header className="flex items-center justify-between px-1 py-1">
                  <h2 className="flex items-center gap-2 font-bold">
                    <span className={`h-3 w-3 rounded-full ${dots[stage.id] ?? "bg-indigo"}`} />
                    {stage.label}
                  </h2>
                  <span className="text-sm font-semibold text-muted">{cards.length}</span>
                </header>
                <div className="mt-2 space-y-2">
                  {cards.map((job) => (
                    <article key={job.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", job.id)} className="cursor-grab rounded-2xl bg-paper p-4 shadow-sm">
                      <Link href={`/tracker/${job.id}`} className="text-base font-bold leading-5">
                        {job.title}
                      </Link>
                      <p className="text-sm text-muted">{job.company}</p>
                      <p className="mt-2 text-sm text-muted">{[job.location, job.workMode].filter(Boolean).join(" · ")}</p>
                      {job.fitScore != null ? (
                        <p className="mt-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs font-semibold text-indigo-deep">
                          {job.fitBand} {job.fitScore}
                        </p>
                      ) : null}
                      <select className="field mt-3" value={job.status} aria-label={`Move ${job.title}`} onChange={(event) => move(job.id, event.target.value)}>
                        {JOB_STAGES.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </article>
                  ))}
                  {cards.length === 0 ? <p className="px-2 py-6 text-sm text-muted">Drop a role here.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
