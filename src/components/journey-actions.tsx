"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { JobResult } from "@/lib/jobs/catalog";
import { saveNiche } from "@/server/strategy-actions";
import { matchResumeToJob, tailorResume, researchCompany, createDeck } from "@/server/material-actions";
import { draftOutreach, markDraftCopied, saveCompany, saveContact, searchMarket, saveSearchedJob } from "@/server/pipeline-actions";
import { startNegotiation } from "@/server/practice-actions";

export function JourneyUpload() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError("");
        if (paste) {
          const { parseResumeText } = await import("@/lib/resume/parse");
          const { saveResume } = await import("@/server/material-actions");
          const result = await saveResume({ title: "Pasted resume", template: "ledger", isPrimary: true, content: parseResumeText(text), rawText: text });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/resumes/${result.data.id}`);
          return;
        }
        const response = await fetch("/api/resumes/upload", { method: "POST", body: new FormData(event.currentTarget) });
        const payload = (await response.json()) as { id?: string; error?: string };
        setPending(false);
        if (!response.ok || !payload.id) {
          setError(payload.error ?? "That file did not parse. Try a PDF or DOCX.");
          return;
        }
        router.push(`/resumes/${payload.id}`);
      }}
    >
      {paste ? (
        <textarea className="field min-h-36" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the resume text" required />
      ) : (
        <input className="block w-full text-base" name="file" type="file" accept=".pdf,.docx,.txt,application/pdf" required />
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {paste ? "Save this resume" : "Upload and score"}
      </Button>
      <button type="button" className="text-sm font-semibold text-indigo" onClick={() => setPaste((value) => !value)}>
        {paste ? "Upload a file instead" : "Paste text instead"}
      </button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}

export function NicheStarter({ titleHint }: { titleHint: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(titleHint);
  const [location, setLocation] = useState("");
  const [keywords, setKeywords] = useState("");
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function show(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const saved = await saveNiche({
      name: title,
      title,
      aliases: "",
      industries: "",
      seniority: "Senior",
      roleCategory: "",
      functionName: "",
      companyTypes: "",
      locations: location,
      workModes: "",
      targetCompanies: "",
      includeKeywords: keywords,
      excludeKeywords: "",
      why: "",
      payBenchmark: "",
      isPrimary: true,
    });
    if (!saved.ok) {
      setPending(false);
      setError(saved.error);
      return;
    }
    const found = await searchMarket({ title, location, workMode: "any", experience: "", keywords });
    setPending(false);
    if (!found.ok) {
      setError(found.error);
      return;
    }
    setJobs(found.data.sample.slice(0, 4));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form className="space-y-3" onSubmit={show}>
        <label className="block text-sm font-medium">
          Target title
          <input className="field mt-1" value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>
        <label className="block text-sm font-medium">
          Where
          <input className="field mt-1" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="London, Toronto or Remote" />
        </label>
        <label className="block text-sm font-medium">
          Skills to include
          <input className="field mt-1" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="kubernetes, terraform" />
        </label>
        <Button className="w-full" type="submit" disabled={pending}>
          See matching jobs
        </Button>
      </form>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
      {jobs.map((job) => (
        <article key={job.externalId} className="desk-card p-4">
          <p className="font-bold">{job.title}</p>
          <p className="text-sm text-muted">{job.company}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => saveSearchedJob(job)}>
            Save
          </Button>
        </article>
      ))}
    </div>
  );
}

export function MatchStep({
  resumeId,
  jobs,
}: {
  resumeId: string | null;
  jobs: { id: string; title: string; company: string }[];
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [missed, setMissed] = useState<string[]>([]);
  const [scores, setScores] = useState<{ before: number; after: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function optimise() {
    if (!resumeId || !jobId) return;
    setPending(true);
    setError("");
    const matched = await matchResumeToJob(resumeId, jobId);
    if (!matched.ok) {
      setPending(false);
      setError(matched.error);
      return;
    }
    setMissed(matched.data.missed.slice(0, 6));
    const tailored = await tailorResume(resumeId, jobId);
    setPending(false);
    if (!tailored.ok) {
      setError(tailored.error);
      return;
    }
    setScores({ before: tailored.data.before, after: tailored.data.after });
    router.refresh();
  }

  if (!resumeId) {
    return <p className="text-base text-muted">Add a resume on the first step, then come back to match a job.</p>;
  }
  if (jobs.length === 0) {
    return <p className="text-base text-muted">Save a role first. The Jobs tab is the short way there.</p>;
  }

  return (
    <div className="space-y-3">
      {jobs.slice(0, 4).map((job) => (
        <button
          key={job.id}
          type="button"
          onClick={() => setJobId(job.id)}
          className={`block w-full rounded-3xl border px-4 py-4 text-left ${jobId === job.id ? "border-indigo bg-mist" : "border-line bg-paper"}`}
        >
          <p className="font-bold">{job.title}</p>
          <p className="text-sm text-muted">{job.company}</p>
        </button>
      ))}
      <Button className="w-full" disabled={pending} onClick={optimise}>
        {pending ? "Optimising…" : "Optimise my resume"}
      </Button>
      {missed.length > 0 ? <p className="text-sm text-muted">Words we looked for: {missed.join(", ")}</p> : null}
      {scores ? (
        <p className="rounded-3xl bg-teal-soft px-4 py-4 text-base font-semibold text-teal">
          Keyword match moved from {scores.before} to {scores.after}. A new copy is in your resumes.
        </p>
      ) : null}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function ReferralStep({
  contact,
}: {
  contact: { id: string; name: string; company: string; body: string; messageId: string } | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(contact?.body ?? "");
  const [messageId, setMessageId] = useState(contact?.messageId ?? "");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  async function writeFor(id: string) {
    setPending(true);
    setError("");
    const result = await draftOutreach(id, "PITCH");
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDraft(result.data.body);
    setMessageId(result.data.id);
    router.refresh();
  }

  async function createAndWrite(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const companyResult = company.trim()
      ? await saveCompany({ name: company, industry: "", website: "", location: "", notes: "" })
      : null;
    const saved = await saveContact({
      name,
      title: "",
      email: "",
      linkedin: "",
      type: "POTENTIAL_REFERRER",
      companyId: companyResult && companyResult.ok ? companyResult.data.id : undefined,
      notes: "",
      tags: "",
    });
    setPending(false);
    if (!saved.ok) {
      setError(saved.error);
      return;
    }
    await writeFor(saved.data.id);
  }

  return (
    <div className="space-y-3">
      {contact ? (
        <p className="text-base">
          Writing to <span className="font-bold">{contact.name}</span>
          {contact.company ? ` at ${contact.company}` : ""}.
        </p>
      ) : (
        <form className="space-y-3" onSubmit={createAndWrite}>
          <input className="field" placeholder="Their name" value={name} onChange={(event) => setName(event.target.value)} required />
          <input className="field" placeholder="Company" value={company} onChange={(event) => setCompany(event.target.value)} />
          <Button className="w-full" type="submit" disabled={pending}>
            Write the note
          </Button>
        </form>
      )}
      {contact && !draft ? (
        <Button className="w-full" disabled={pending} onClick={() => writeFor(contact.id)}>
          Write the note
        </Button>
      ) : null}
      {draft ? (
        <div className="rounded-3xl bg-sun-soft p-4">
          <p className="whitespace-pre-wrap text-base leading-7">{draft}</p>
          <Button
            className="mt-4 w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(draft);
              if (messageId) await markDraftCopied(messageId);
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy the note"}
          </Button>
          <p className="mt-2 text-sm text-muted">Paste it into your own message. This desk does not send it.</p>
        </div>
      ) : null}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function PitchStep({ deck }: { deck: { id: string; companyName: string; problem: string } | null }) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [problems, setProblems] = useState<{ title: string; detail: string }[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [made, setMade] = useState(deck?.id ?? "");

  async function research(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const saved = await saveCompany({ name: company, industry: "", website: "", location: "", notes });
    if (!saved.ok) {
      setPending(false);
      setError(saved.error);
      return;
    }
    setCompanyId(saved.data.id);
    const found = await researchCompany(saved.data.id, notes);
    setPending(false);
    if (!found.ok) {
      setError(found.error);
      return;
    }
    setProblems(found.data);
  }

  async function choose(problem: string) {
    setPending(true);
    setError("");
    const result = await createDeck({ companyId, companyName: company, problem, proof: notes });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMade(result.data.id);
    router.refresh();
  }

  if (deck || made) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-indigo to-violet p-5 text-white">
        <p className="text-sm font-semibold text-white">Deck ready</p>
        <p className="mt-2 text-2xl font-bold">{deck?.companyName || company}</p>
        <p className="mt-2 text-base text-white/90">{deck?.problem || "Open the slides, edit any line, then print to PDF."}</p>
        <a className="mt-4 inline-flex h-12 items-center rounded-full bg-sun px-5 font-bold text-ink" href={`/pitch/${deck?.id || made}`}>
          Open the slides
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {problems.length === 0 ? (
        <form className="space-y-3" onSubmit={research}>
          <input className="field" placeholder="Company" value={company} onChange={(event) => setCompany(event.target.value)} required />
          <textarea className="field min-h-24" placeholder="What do you already know about them?" value={notes} onChange={(event) => setNotes(event.target.value)} />
          <Button className="w-full" type="submit" disabled={pending}>
            Find a likely problem
          </Button>
        </form>
      ) : (
        problems.slice(0, 3).map((problem) => (
          <button key={problem.title} type="button" className="block w-full rounded-3xl bg-paper px-4 py-4 text-left ring-1 ring-line" onClick={() => choose(problem.title)} disabled={pending}>
            <p className="font-bold">{problem.title}</p>
            <p className="mt-1 text-sm text-muted">{problem.detail}</p>
          </button>
        ))
      )}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function NegotiateStep({
  existingId,
  script,
  defaults,
}: {
  existingId: string;
  script: string;
  defaults: { title: string; target: string; floor: string; offer: string; jobId: string };
}) {
  const router = useRouter();
  const [target, setTarget] = useState(defaults.target);
  const [floor, setFloor] = useState(defaults.floor);
  const [offer, setOffer] = useState(defaults.offer);
  const [sessionId, setSessionId] = useState(existingId);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function begin(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await startNegotiation({
      title: defaults.title,
      jobId: defaults.jobId || undefined,
      target,
      floor,
      offer,
      difficulty: "medium",
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSessionId(result.data.id);
    router.push(`/negotiate/${result.data.id}`);
  }

  if (sessionId && script) {
    return (
      <div className="space-y-3">
        <p className="whitespace-pre-wrap rounded-3xl bg-coral-soft p-4 text-base leading-7">{script}</p>
        <a className="flex h-12 items-center justify-center rounded-full bg-coral font-bold text-white" href={`/negotiate/${sessionId}`}>
          Rehearse the conversation
        </a>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={begin}>
      <label className="block text-sm font-medium">
        The number you want
        <input className="field mt-1" value={target} onChange={(event) => setTarget(event.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        The number you will not go under
        <input className="field mt-1" value={floor} onChange={(event) => setFloor(event.target.value)} required />
      </label>
      <label className="block text-sm font-medium">
        What they offered
        <input className="field mt-1" value={offer} onChange={(event) => setOffer(event.target.value)} />
      </label>
      <Button className="w-full" type="submit" disabled={pending}>
        Write my counter
      </Button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}
