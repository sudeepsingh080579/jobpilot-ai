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
  const [table, setTable] = useState(false);
  const [hideRejected, setHideRejected] = useState(false);
  const visible = useMemo(() => jobs.filter((job) => (hideRejected ? job.status !== "REJECTED" : true)), [jobs, hideRejected]);

  function move(id: string, status: string) {
    run(() => updateJob({ id, status }));
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" type="button" onClick={() => setTable((value) => !value)}>
          {table ? "Board" : "Table"}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={hideRejected} onChange={(event) => setHideRejected(event.target.checked)} />
          Hide rejected
        </label>
        {pending ? <span className="text-sm text-muted">Saving…</span> : null}
        {error ? <span className="text-sm text-bad">{error}</span> : null}
      </div>
      {jobs.length === 0 ? (
        <div className="desk-card p-6 text-sm text-muted">
          The board is empty. <Link className="text-pine" href="/search">Search the sample market</Link> or paste a role you already have.
        </div>
      ) : null}
      {table ? (
        <div className="desk-card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Fit</th>
                <th className="px-3 py-2 font-medium">Stage</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((job) => (
                <tr key={job.id} className="border-t border-line">
                  <td className="px-3 py-2">
                    <Link href={`/tracker/${job.id}`} className="font-medium">
                      {job.title}
                    </Link>
                    <p className="text-muted">{job.company}</p>
                  </td>
                  <td className="px-3 py-2">{job.fitScore ?? "–"} {job.fitBand}</td>
                  <td className="px-3 py-2">
                    <select className="field" value={job.status} aria-label={`Stage for ${job.title}`} onChange={(event) => move(job.id, event.target.value)}>
                      {JOB_STAGES.map((stage) => (
                        <option key={stage.id} value={stage.id}>{stage.label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div data-testid="tracker-board" className="flex gap-3 overflow-x-auto pb-3">
          {JOB_STAGES.filter((stage) => (hideRejected ? stage.id !== "REJECTED" : true)).map((stage) => {
            const cards = visible.filter((job) => job.status === stage.id);
            return (
              <section
                key={stage.id}
                className="w-72 shrink-0 rounded-2xl bg-[#ebe4d6] p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  const id = event.dataTransfer.getData("text/plain");
                  if (id) move(id, stage.id);
                }}
              >
                <header className="flex items-center justify-between px-2 py-1 text-sm">
                  <h2 className="font-medium">{stage.label}</h2>
                  <span className="text-muted">{cards.length}</span>
                </header>
                <div className="space-y-2">
                  {cards.map((job) => (
                    <article key={job.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", job.id)} className="desk-card cursor-grab p-3">
                      <Link href={`/tracker/${job.id}`} className="font-medium leading-5">
                        {job.title}
                      </Link>
                      <p className="text-sm text-muted">{job.company}</p>
                      <p className="mt-2 text-xs text-muted">{[job.location, job.workMode].filter(Boolean).join(" · ")}</p>
                      {job.fitScore != null ? (
                        <p className="mt-2 inline-block rounded-full bg-mist px-2 py-0.5 text-xs text-pine">
                          {job.fitBand} {job.fitScore}
                        </p>
                      ) : null}
                    </article>
                  ))}
                  {cards.length === 0 ? <p className="px-2 py-4 text-xs text-muted">Drop a role here.</p> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
