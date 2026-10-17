import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { AddCompanyForm, CopyButton, RunHuntButton } from "@/components/hunt-ui";
import { prisma } from "@/lib/prisma";
import { suggestCompanies } from "@/lib/hunt/catalog";
import type { Answer } from "@/lib/hunt/answers";
import { addSuggestionAction, deleteAnswerAction, markJobAction, saveAnswerAction, saveHuntSettingsAction, toggleCompanyAction } from "@/server/hunt-actions";
import { ensureSeeded, getHuntSettings } from "@/server/hunt-store";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Job Hunt Agent" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST" : "never");

export default async function HuntPage() {
  const user = await requireUser();
  await ensureSeeded(user.id);
  const [settings, prefs, companies, queue, skipped, applied, runs, saved, resumeCount] = await Promise.all([
    getHuntSettings(user.id),
    prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    prisma.huntCompany.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "queued" }, orderBy: { score: "desc" }, take: 50 }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "skipped" }, orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "applied" }, orderBy: { appliedAt: "desc" }, take: 30 }),
    prisma.huntRun.findMany({ where: { userId: user.id }, orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.savedAnswer.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.resume.count({ where: { userId: user.id } }),
  ]);
  const suggestions = suggestCompanies(companies, prefs?.industries ?? []);
  const enabled = companies.filter((c) => c.enabled).length;

  return (
    <div className="space-y-6" data-testid="hunt-page">
      <PageHeader eyebrow="Agent" title="Job Hunt Agent" />
      <section className="desk-card space-y-3 p-5">
        <p className="text-sm text-muted">
          Polls each employer&apos;s own public careers board (Greenhouse, Lever, Ashby, SmartRecruiters), keeps roles matching your target titles,
          applies your location and sponsorship rules, scores them against your resume, and queues roles scoring ≥ {settings.threshold}. Nothing is submitted for you:
          you open each application, paste the prepared answers, and mark it applied.
        </p>
        <p className="text-xs text-muted">
          Target roles: {prefs?.targetRoles.join(", ") || "none set"} · Resume: {resumeCount ? "on file" : "missing"} · Employers enabled: {enabled}/{companies.length} ·
          Scoring: deterministic keyword + title match (no AI model is used for scoring right now).
        </p>
        <RunHuntButton />
        {runs.length ? (
          <ul className="text-xs text-muted" data-testid="runs">
            {runs.map((r) => (
              <li key={r.id}>{ist(r.startedAt)} · {r.trigger} · {r.status} · {r.companies} companies · {r.fetched} fetched · {r.relevant} title matches · {r.fresh} new · {r.queued} queued · {r.skipped} skipped{JSON.parse(r.errors).length ? ` · ${JSON.parse(r.errors).length} errors` : ""}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Apply queue ({queue.length})</h2>
        {queue.length === 0 ? <p className="text-sm text-muted">No queued roles yet. Run the hunt.</p> : null}
        {queue.map((j) => {
          const answers = JSON.parse(j.answers) as Answer[];
          const detail = JSON.parse(j.scoreDetail) as { matched?: string[]; missing?: string[] };
          const answerText = answers.map((a) => `${a.question}: ${a.answer}`).join("\n");
          return (
            <article key={j.id} className="desk-card space-y-2 p-4" data-testid="queue-item">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold">{j.title} · {j.company}</p>
                  <p className="text-xs text-muted">{j.location} · {j.country} · score <strong>{j.score}</strong> · via {j.ats}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={j.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full bg-sun px-4 font-bold text-ink" data-testid="open-application">Open application</a>
                  <form action={markJobAction}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="decision" value="applied" /><button className="h-10 rounded-full bg-teal px-4 font-bold text-white">Mark applied</button></form>
                  <form action={markJobAction}><input type="hidden" name="id" value={j.id} /><input type="hidden" name="decision" value="dismissed" /><button className="h-10 rounded-full border-2 border-line px-4 font-bold">Dismiss</button></form>
                </div>
              </div>
              {j.needsInput.length ? <p className="rounded-xl bg-coral-soft px-3 py-2 text-xs font-semibold" data-testid="needs-input">Needs your input: {j.needsInput.join(" · ")}</p> : null}
              <p className="text-xs text-muted">Matched: {detail.matched?.join(", ") || "—"}{detail.missing?.length ? ` · Not in resume: ${detail.missing.join(", ")}` : ""}</p>
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Prepared answers <CopyButton text={answerText} label="Copy all" /></summary>
                <ul className="mt-2 space-y-1">{answers.map((a) => <li key={a.question} className="flex flex-wrap items-center gap-2"><span className="text-muted">{a.question}:</span> <span>{a.answer}</span> <CopyButton text={a.answer} /></li>)}</ul>
              </details>
              <details className="text-sm">
                <summary className="cursor-pointer font-semibold">Tailored resume (reordered, nothing added) <CopyButton text={j.tailored} /></summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-ink/5 p-3 text-xs">{j.tailored}</pre>
              </details>
            </article>
          );
        })}
      </section>

      <section>
        <h2 className="text-xl font-bold">Skipped ({skipped.length} most recent)</h2>
        <ul className="mt-2 space-y-1 text-xs" data-testid="skipped">
          {skipped.map((j) => <li key={j.id}><a className="underline" href={j.url} target="_blank" rel="noopener noreferrer">{j.title}</a> · {j.company} · {j.location || "—"} · score {j.score} — <span className="text-muted">{j.skipReason}</span></li>)}
        </ul>
      </section>

      {applied.length ? (
        <section>
          <h2 className="text-xl font-bold">Applied ({applied.length})</h2>
          <ul className="mt-2 space-y-1 text-xs">{applied.map((j) => <li key={j.id}>{j.title} · {j.company} · {ist(j.appliedAt)}</li>)}</ul>
        </section>
      ) : null}

      <section className="desk-card space-y-3 p-5">
        <h2 className="text-xl font-bold">Rules</h2>
        <form action={saveHuntSettingsAction} className="grid gap-3 text-sm sm:grid-cols-2">
          <label>Score threshold<input name="threshold" type="number" min={0} max={100} defaultValue={settings.threshold} className="mt-1 w-full rounded-xl border p-2" /></label>
          <label>Companies per run<input name="companiesPerRun" type="number" min={1} max={60} defaultValue={settings.companiesPerRun} className="mt-1 w-full rounded-xl border p-2" /></label>
          <label className="sm:col-span-2">Allowed countries (comma-separated)<input name="allowedCountries" defaultValue={settings.allowedCountries.join(", ")} className="mt-1 w-full rounded-xl border p-2" /></label>
          <label>Home country<input name="homeCountry" defaultValue={settings.homeCountry} className="mt-1 w-full rounded-xl border p-2" /></label>
          <div className="space-y-1">
            <label className="flex gap-2"><input type="checkbox" name="needsSponsorship" defaultChecked={settings.needsSponsorship} /> I need visa sponsorship outside my home country</label>
            <label className="flex gap-2"><input type="checkbox" name="allowUsWithSponsorship" defaultChecked={settings.allowUsWithSponsorship} /> Include US roles only when the posting mentions visa sponsorship</label>
            <label className="flex gap-2"><input type="checkbox" name="autoRun" defaultChecked={settings.autoRun} /> Run automatically once a day</label>
          </div>
          <button className="h-10 w-fit rounded-full bg-indigo px-5 font-bold text-white">Save rules</button>
        </form>
      </section>

      <section className="desk-card space-y-3 p-5">
        <h2 className="text-xl font-bold">Saved answers</h2>
        <ul className="space-y-1 text-sm">{saved.map((s) => <li key={s.id} className="flex flex-wrap items-center gap-2"><span className="text-muted">{s.question}:</span> {s.answer}<form action={deleteAnswerAction}><input type="hidden" name="id" value={s.id} /><button className="text-xs text-bad">Remove</button></form></li>)}</ul>
        <form action={saveAnswerAction} className="grid gap-2 text-sm sm:grid-cols-[1fr,2fr,auto]">
          <input name="question" placeholder="Question (e.g. Expected salary)" className="rounded-xl border p-2" />
          <input name="answer" placeholder="Your answer" className="rounded-xl border p-2" />
          <button className="h-10 rounded-full bg-teal px-4 font-bold text-white">Save</button>
        </form>
      </section>

      <section className="desk-card space-y-3 p-5">
        <h2 className="text-xl font-bold">Employers ({companies.length})</h2>
        <AddCompanyForm />
        {suggestions.length ? (
          <div>
            <p className="text-sm font-semibold">Suggestions (verified boards not in your list)</p>
            <div className="mt-1 flex flex-wrap gap-2">{suggestions.map((s) => (
              <form key={s.ats + s.token} action={addSuggestionAction}><input type="hidden" name="ats" value={s.ats} /><input type="hidden" name="token" value={s.token} /><button className="rounded-full border px-3 py-1 text-xs">+ {s.name} <span className="text-muted">(suggestion)</span></button></form>
            ))}</div>
          </div>
        ) : null}
        <ul className="grid gap-1 text-xs sm:grid-cols-2" data-testid="companies">
          {companies.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 odd:bg-ink/5">
              <span className={c.enabled ? "" : "text-muted line-through"}>{c.name} · {c.ats}/{c.boardToken} · {c.industry} {c.lastStatus ? `· ${c.lastStatus}` : ""}</span>
              <form action={toggleCompanyAction}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="enabled" value={c.enabled ? "0" : "1"} /><button className="underline">{c.enabled ? "Disable" : "Enable"}</button></form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
