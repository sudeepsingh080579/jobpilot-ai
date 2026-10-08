"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ResumeView } from "@/components/resume-view";
import { Button } from "@/components/ui/button";
import { RESUME_TEMPLATES } from "@/lib/domain";
import { resumeToText, type ResumeContent } from "@/lib/resume/types";
import { matchKeywords } from "@/lib/scoring/ats";
import { scoreResume } from "@/lib/scoring/resume-score";
import { deleteResume, matchResumeToJob, saveResume, tailorResume } from "@/server/material-actions";
import { useRun } from "@/components/use-run";

export function ResumeEditor({
  resume,
  jobs,
}: {
  resume: { id: string; title: string; template: string; isPrimary: boolean; content: ResumeContent };
  jobs: { id: string; title: string; company: string; description: string }[];
}) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const [title, setTitle] = useState(resume.title);
  const [template, setTemplate] = useState(resume.template);
  const [primary, setPrimary] = useState(resume.isPrimary);
  const [content, setContent] = useState(resume.content);
  const [tab, setTab] = useState<"edit" | "preview" | "score">("edit");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [ats, setAts] = useState<{ score: number; matched: string[]; missed: string[] } | null>(null);
  const [note, setNote] = useState("");
  const scored = useMemo(() => scoreResume(content), [content]);
  const liveAts = useMemo(() => {
    const job = jobs.find((item) => item.id === jobId);
    if (!job) return null;
    return matchKeywords(resumeToText(content), job.description);
  }, [content, jobId, jobs]);

  function patch(partial: Partial<ResumeContent>) {
    setContent((current) => ({ ...current, ...partial }));
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["edit", "preview", "score"] as const).map((item) => (
          <button key={item} className={`rounded-lg px-3 py-1.5 text-sm ${tab === item ? "bg-pine text-cream" : "bg-paper"}`} type="button" onClick={() => setTab(item)}>
            {item === "edit" ? "Edit" : item === "preview" ? "Preview" : "Score"}
          </button>
        ))}
        <Link className="rounded-lg border border-line bg-paper px-3 py-1.5 text-sm" href={`/print/resume/${resume.id}`} target="_blank">
          Export PDF
        </Link>
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => saveResume({ id: resume.id, title, template, isPrimary: primary, content, rawText: resumeToText(content) }))
          }
        >
          Save
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => deleteResume(resume.id), () => router.push("/resumes"))}>
          Delete
        </Button>
        {error ? <span className="text-sm text-bad">{error}</span> : null}
        {note ? <span className="text-sm text-pine">{note}</span> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={tab === "preview" ? "hidden lg:block" : tab === "score" ? "hidden lg:block" : ""}>
          <div className="desk-card space-y-3 p-4">
            <label className="block text-sm">Title<input className="field mt-1" value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} /> Primary resume
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              {RESUME_TEMPLATES.map((item) => (
                <button key={item.id} type="button" onClick={() => setTemplate(item.id)} className={`rounded-lg border p-2 text-left text-xs ${template === item.id ? "border-pine bg-mist" : "border-line"}`}>
                  <span className="block font-medium">{item.label}</span>
                  {item.detail}
                </button>
              ))}
            </div>
            <label className="block text-sm">Name<input className="field mt-1" value={content.name} onChange={(event) => patch({ name: event.target.value })} /></label>
            <label className="block text-sm">Headline<input className="field mt-1" value={content.headline} onChange={(event) => patch({ headline: event.target.value })} /></label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-sm">Location<input className="field mt-1" value={content.location} onChange={(event) => patch({ location: event.target.value })} /></label>
              <label className="text-sm">Email<input className="field mt-1" value={content.email} onChange={(event) => patch({ email: event.target.value })} /></label>
            </div>
            <label className="block text-sm">Phone<input className="field mt-1" value={content.phone} onChange={(event) => patch({ phone: event.target.value })} /></label>
            <label className="block text-sm">Summary<textarea className="field mt-1 min-h-28" value={content.summary} onChange={(event) => patch({ summary: event.target.value })} /></label>
            <label className="block text-sm">
              Skills, comma separated
              <textarea
                className="field mt-1 min-h-16"
                value={content.skills.flatMap((group) => group.items).join(", ")}
                onChange={(event) =>
                  patch({
                    skills: [{ group: "Skills", items: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) }],
                  })
                }
              />
            </label>
            {content.experience.map((role, index) => (
              <fieldset key={`${role.company}-${index}`} className="rounded-lg border border-line p-3">
                <legend className="px-1 text-xs text-muted">Role {index + 1}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="field" value={role.title} aria-label="Role title" onChange={(event) => updateRole(index, { title: event.target.value })} />
                  <input className="field" value={role.company} aria-label="Company" onChange={(event) => updateRole(index, { company: event.target.value })} />
                </div>
                <textarea
                  className="field mt-2 min-h-24"
                  aria-label="Bullets"
                  value={role.bullets.join("\n")}
                  onChange={(event) => updateRole(index, { bullets: event.target.value.split("\n").filter((line) => line.trim()) })}
                />
              </fieldset>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                patch({
                  experience: [...content.experience, { company: "", title: "", location: "", start: "", end: "", bullets: [] }],
                })
              }
            >
              Add a role
            </Button>
          </div>
        </div>
        <div className={tab === "edit" ? "hidden lg:block" : ""}>
          {tab !== "score" ? (
            <div data-testid="resume-preview">
              <ResumeView content={content} template={template} />
            </div>
          ) : null}
          <div data-testid="resume-score" className={`desk-card mt-4 p-4 ${tab === "preview" ? "hidden lg:block" : ""}`}>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-brass">Resume score</p>
                <p className="font-serif text-5xl">{scored.score}</p>
              </div>
              <p className="text-sm text-muted">{scored.passed}/{scored.total} checks · {scored.band}</p>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {scored.checks.map((check) => (
                <li key={check.id} className={check.pass ? "text-good" : "text-bad"}>
                  {check.pass ? "Pass" : "Fix"} · {check.label}
                  {!check.pass ? <span className="block text-muted">{check.hint}</span> : null}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-sm font-medium">ATS keywords</p>
              <select className="field mt-2" value={jobId} onChange={(event) => setJobId(event.target.value)}>
                {jobs.length === 0 ? <option value="">Save a job first</option> : null}
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>{job.company} — {job.title}</option>
                ))}
              </select>
              {liveAts ? (
                <div className="mt-2 text-sm">
                  <p>Live match {liveAts.score}. Missing: {liveAts.missed.slice(0, 8).join(", ") || "none"}.</p>
                  <p className="text-muted">Matched: {liveAts.matched.slice(0, 8).join(", ") || "none"}.</p>
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!jobId || pending}
                  onClick={() =>
                    run(() => matchResumeToJob(resume.id, jobId), (data) => {
                      setAts(data);
                      setTab("score");
                    })
                  }
                >
                  Save-based ATS check
                </Button>
                <Button
                  size="sm"
                  disabled={!jobId || pending}
                  onClick={() =>
                    run(() => tailorResume(resume.id, jobId), (data) => {
                      setNote(data.notes);
                      router.push(`/resumes/${data.id}`);
                    })
                  }
                >
                  Tailor a copy
                </Button>
              </div>
              {ats ? <p className="mt-2 text-sm">Stored check scored {ats.score}. Missed {ats.missed.slice(0, 6).join(", ") || "nothing"}.</p> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  function updateRole(index: number, partial: Partial<ResumeContent["experience"][number]>) {
    setContent((current) => ({
      ...current,
      experience: current.experience.map((role, roleIndex) => (roleIndex === index ? { ...role, ...partial } : role)),
    }));
  }
}
