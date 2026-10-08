"use client";

import Link from "next/link";
import { useState } from "react";
import { draftsForStage, JOB_STAGES } from "@/lib/domain";
import { draftForStage, updateJob } from "@/server/pipeline-actions";
import { Button } from "@/components/ui/button";
import { useRun } from "@/components/use-run";

export function JobDetail({
  job,
  drafts,
  contacts,
}: {
  job: { id: string; title: string; company: string; status: string; notes: string; description: string; keywords: string[]; fitScore: number | null; fitBand: string; fitNarrative: string; location: string; salary: string; url: string };
  drafts: { id: string; kind: string; content: string }[];
  contacts: { id: string; name: string; title: string }[];
}) {
  const { error, pending, run } = useRun();
  const [notes, setNotes] = useState(job.notes);
  const [status, setStatus] = useState(job.status);
  const [latest, setLatest] = useState<Record<string, string>>({});
  const kinds = draftsForStage(status);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
      <div className="space-y-4">
        <section className="desk-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select className="field max-w-xs" value={status} onChange={(event) => { setStatus(event.target.value); run(() => updateJob({ id: job.id, status: event.target.value })); }}>
              {JOB_STAGES.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}
            </select>
            {job.fitScore != null ? <span className="rounded-full bg-mist px-3 py-1 text-sm text-pine">{job.fitBand} {job.fitScore}</span> : null}
            <Button size="sm" variant="outline" onClick={() => run(() => updateJob({ id: job.id, archived: true }))}>Archive</Button>
          </div>
          <p className="mt-3 text-sm text-muted">{[job.location, job.salary].filter(Boolean).join(" · ")}</p>
          {job.fitNarrative ? <p className="mt-2 text-sm leading-6">{job.fitNarrative}</p> : null}
          {job.url ? <a className="mt-2 inline-block text-sm text-pine" href={job.url}>Original link</a> : null}
        </section>
        <section className="desk-card p-4">
          <h2 className="font-serif text-2xl">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{job.description}</p>
          <p className="mt-3 text-xs text-muted">Keywords: {job.keywords.join(", ") || "none detected"}</p>
        </section>
        <section className="desk-card p-4">
          <h2 className="font-serif text-2xl">Notes</h2>
          <textarea className="field mt-2 min-h-24" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <Button className="mt-2" size="sm" disabled={pending} onClick={() => run(() => updateJob({ id: job.id, notes }))}>Save notes</Button>
        </section>
        <section className="desk-card p-4">
          <h2 className="font-serif text-2xl">Drafts for this stage</h2>
          <p className="mt-1 text-sm text-muted">These stay on the desk. Copy them into your own mail or LinkedIn.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {kinds.map((kind) => (
              <Button key={kind.id} size="sm" variant="outline" disabled={pending} onClick={() => run(() => draftForStage(job.id, kind.id), (data) => setLatest((current) => ({ ...current, [kind.id]: data.content })))}>
                {kind.label}
              </Button>
            ))}
            <Link className="rounded-lg bg-pine px-3 py-1.5 text-xs text-cream" href={`/assistant?job=${job.id}`}>Open in assistant</Link>
            <Link className="rounded-lg border border-line px-3 py-1.5 text-xs" href={`/letters?job=${job.id}`}>Cover letter</Link>
          </div>
          {kinds.map((kind) => {
            const content = latest[kind.id] ?? drafts.find((draft) => draft.kind === kind.id)?.content;
            if (!content) return null;
            return (
              <article key={kind.id} className="mt-3 rounded-lg bg-cream p-3 text-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{kind.label}</h3>
                  <button type="button" className="text-xs text-pine" onClick={() => navigator.clipboard.writeText(content)}>Copy</button>
                </div>
                <p className="mt-2 whitespace-pre-wrap leading-6">{content}</p>
              </article>
            );
          })}
          {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
        </section>
      </div>
      <aside className="desk-card h-fit p-4">
        <h2 className="font-serif text-2xl">People</h2>
        {contacts.length === 0 ? <p className="mt-2 text-sm text-muted">No contacts on this role yet.</p> : null}
        <ul className="mt-2 space-y-2 text-sm">
          {contacts.map((contact) => (
            <li key={contact.id}>
              <Link className="text-pine" href={`/network/${contact.id}`}>{contact.name}</Link>
              <p className="text-muted">{contact.title}</p>
            </li>
          ))}
        </ul>
        <Link className="mt-3 inline-block text-sm text-pine" href={`/network?job=${job.id}`}>Add a contact</Link>
      </aside>
    </div>
  );
}
