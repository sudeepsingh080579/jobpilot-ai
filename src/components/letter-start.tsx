"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { generateLetter } from "@/server/material-actions";
import { useRun } from "@/components/use-run";

export function LetterStart({ jobs, resumes, initialJob }: { jobs: { id: string; title: string; company: string }[]; resumes: { id: string; title: string }[]; initialJob?: string }) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const [jobId, setJobId] = useState(initialJob ?? jobs[0]?.id ?? "");
  const [resumeId, setResumeId] = useState(resumes[0]?.id ?? "");
  return (
    <form className="desk-card flex flex-wrap gap-2 p-4" onSubmit={(e) => { e.preventDefault(); run(() => generateLetter({ jobId, resumeId }), (data) => router.push(`/letters/${data.id}`)); }}>
      <select className="field max-w-xs" value={jobId} onChange={(e) => setJobId(e.target.value)} required>
        {jobs.length === 0 ? <option value="">Save a job first</option> : null}
        {jobs.map((job) => <option key={job.id} value={job.id}>{job.company} — {job.title}</option>)}
      </select>
      <select className="field max-w-xs" value={resumeId} onChange={(e) => setResumeId(e.target.value)}>
        {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.title}</option>)}
      </select>
      <Button type="submit" disabled={pending || !jobId}>Generate</Button>
      {error ? <p className="w-full text-sm text-bad">{error}</p> : null}
    </form>
  );
}
