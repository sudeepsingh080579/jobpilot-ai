import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { AddCompanyForm, CopyButton, RunHuntButton } from "@/components/hunt-ui";
import { prisma } from "@/lib/prisma";
import { suggestCompanies, VERIFIED_COMPANIES } from "@/lib/hunt/catalog";
import { CATCH_UP_MIN, nextRunText } from "@/lib/hunt/schedule";
import type { Answer } from "@/lib/hunt/answers";
import { addSuggestionAction, deleteAnswerAction, markNoticesReadAction, markJobAction, saveAnswerAction, saveHuntSettingsAction, toggleCompanyAction } from "@/server/hunt-actions";
import { ensureSeeded, getHuntSettings } from "@/server/hunt-store";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Job Hunt Agent" };
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST" : "never");

const TIMEZONES = ["Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Europe/London", "Europe/Berlin", "Europe/Amsterdam", "America/New_York", "America/Los_Angeles", "UTC"];
const TZ_LABEL: Record<string, string> = { "Asia/Kolkata": "India (IST)", "Asia/Dubai": "UAE (GST)", "Asia/Singapore": "Singapore", "Europe/London": "UK", "Europe/Berlin": "Germany / CET", "Europe/Amsterdam": "Netherlands / CET", "America/New_York": "US Eastern", "America/Los_Angeles": "US Pacific", UTC: "UTC" };
const posted = (d: Date | null, kind: string) => {
  if (!d || kind === "unknown") return "date unknown";
  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
  return `posted ${days === 0 ? "today" : days === 1 ? "1 day ago" : `${days} days ago`}${kind === "approx" ? " (approx.)" : ""}`;
};

function Switch({ name, defaultChecked, label, testId }: { name: string; defaultChecked: boolean; label: string; testId?: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <span className="relative inline-flex h-7 w-12 shrink-0">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} data-testid={testId} role="switch" className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0" />
        <span className="absolute inset-0 rounded-full bg-ink/20 transition peer-checked:bg-teal peer-focus-visible:ring-2 peer-focus-visible:ring-indigo" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}

export default async function HuntPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  await ensureSeeded(user.id);
  const [settings, prefs, companies, queue, skipped, applied, runs, saved, resumeCount, version, notices] = await Promise.all([
    getHuntSettings(user.id),
    prisma.jobPreferences.findUnique({ where: { userId: user.id } }),
    prisma.huntCompany.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "queued" }, orderBy: { score: "desc" }, take: 50 }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "skipped" }, orderBy: { createdAt: "desc" }, take: 60 }),
    prisma.huntJob.findMany({ where: { userId: user.id, decision: "applied" }, orderBy: { appliedAt: "desc" }, take: 30 }),
    prisma.huntRun.findMany({ where: { userId: user.id }, orderBy: { startedAt: "desc" }, take: 5 }),
    prisma.savedAnswer.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.resume.count({ where: { userId: user.id } }),
    prisma.resumeVersion.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.userNotice.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);
  const suggestions = suggestCompanies(companies, prefs?.industries ?? []);
  const enabled = companies.filter((c) => c.enabled).length;
  const byAts = VERIFIED_COMPANIES.reduce<Record<string, number>>((m, c) => ({ ...m, [c.ats]: (m[c.ats] ?? 0) + 1 }), {});
  const unread = notices.filter((n) => !n.readAt).length;
  const hhmm = `${String(settings.autoRunHour).padStart(2, "0")}:${String(settings.autoRunMinute).padStart(2, "0")}`;
  const nextRun = nextRunText({ now: new Date(), timeZone: settings.timezone, hour: settings.autoRunHour, minute: settings.autoRunMinute, lastRunAt: settings.lastAutoRunAt });

  return (
    <div className="space-y-6" data-testid="hunt-page">
      <PageHeader eyebrow="Agent" title="Job Hunt Agent" />
      <section className="desk-card space-y-3 p-5">
        <p className="text-sm text-muted">
          Reads each employer&apos;s own public careers board, keeps roles posted in the last {settings.freshnessDays} day{settings.freshnessDays === 1 ? "" : "s"} that match your target titles and locations,
          scores them against your resume, and for roles scoring ≥ {settings.threshold} prepares a tailored ATS resume and the application answers.
          <strong> It never submits an application for you</strong>: the employer sites need your own login, CAPTCHA and consent, so you open each application, upload the tailored resume, paste the answers and mark it applied.
        </p>
        <p className="text-xs text-muted" data-testid="hunt-facts">
          Target roles: {prefs?.targetRoles.join(", ") || "none set"} · Locations: {prefs?.locations.join(", ") || "India (default)"}{prefs?.remoteIndia === false ? "" : " + remote"} ·
          Resume in use: {version ? `Enhanced v${version.version} (ATS ${version.atsAfter}/100)` : resumeCount ? "original upload (not yet enhanced)" : "missing"} ·{" "}
          <a href="/start" className="font-semibold text-indigo underline">{version ? "Upload another resume / re-enhance" : "Upload & enhance your resume"}</a> ·
          Employers enabled: {enabled}/{companies.length}. Catalog: {VERIFIED_COMPANIES.length} verified career boards ({Object.entries(byAts).map(([k, v]) => `${k} ${v}`).join(", ")}), each checked live. This is a verified list, not a ranked &quot;top 200&quot;.
          Scoring: deterministic keyword + title match (no AI model).
        </p>
        {version ? (
          <p className="text-xs">
            <a className="font-semibold text-indigo underline" href={`/api/resumes/versions/${version.id}/download?format=pdf`}>Download enhanced resume (PDF)</a> ·{" "}
            <a className="font-semibold text-indigo underline" href={`/api/resumes/versions/${version.id}/download?format=docx`}>DOCX</a>
          </p>
        ) : null}
        <RunHuntButton autoStart={sp.run === "1"} />
        {runs.length ? (
          <ul className="text-xs text-muted" data-testid="runs">
            {runs.map((r) => (
              <li key={r.id}>{ist(r.startedAt)} · {r.trigger} · {r.status} · {r.companies} companies · {r.fetched} fetched · {r.stale} older than window · {r.undated} undated · {r.relevant} title matches · {r.locationSkipped} outside locations · {r.queued} queued · {r.skipped} skipped{JSON.parse(r.errors).length ? ` · ${JSON.parse(r.errors).length} errors` : ""}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {notices.length ? (
        <section className="desk-card space-y-2 p-5" data-testid="notices">
          <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Notifications{unread ? ` (${unread} new)` : ""}</h2>{unread ? <form action={markNoticesReadAction}><button className="text-xs underline">Mark all read</button></form> : null}</div>
          <ul className="space-y-1 text-sm">{notices.map((n) => <li key={n.id} className={n.readAt ? "text-muted" : "font-semibold"}>{ist(n.createdAt)} · {n.title}{n.body ? ` — ${n.body}` : ""}</li>)}</ul>
        </section>
      ) : null}

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
                  <p className="text-xs text-muted">{j.location} · {j.country} · score <strong>{j.score}</strong> · via {j.ats} · <span data-testid="posted">{posted(j.postedAt, j.dateKind)}</span></p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={j.url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-full bg-sun px-4 font-bold text-ink" data-testid="open-application">Open application</a>
                  {j.tailoredContent !== "{}" ? (
                    <>
                      <a href={`/api/hunt/jobs/${j.id}/resume?format=pdf`} className="inline-flex h-10 items-center rounded-full border-2 border-indigo px-4 font-bold text-indigo" data-testid="tailored-pdf">Tailored resume PDF</a>
                      <a href={`/api/hunt/jobs/${j.id}/resume?format=docx`} className="inline-flex h-10 items-center rounded-full border-2 border-indigo px-4 font-bold text-indigo" data-testid="tailored-docx">DOCX</a>
                    </>
                  ) : null}
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
                <summary className="cursor-pointer font-semibold">Tailored resume text (reordered and re-worded from your own facts, nothing added) <CopyButton text={j.tailored} /></summary>
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

      <section className="desk-card space-y-4 p-5" data-testid="hunt-settings">
        <h2 className="text-xl font-bold">Daily automation &amp; rules</h2>
        <form action={saveHuntSettingsAction} className="space-y-4 text-sm">
          <div className="rounded-2xl border-2 border-line p-4 space-y-3">
            <Switch name="autoRun" defaultChecked={settings.autoRun} label="Run daily: search, tailor and queue automatically" testId="auto-run-switch" />
            <div className="grid gap-3 sm:grid-cols-2">
              <label>Time of day<input name="autoRunTime" type="time" defaultValue={hhmm} data-testid="auto-run-time" className="mt-1 w-full rounded-xl border p-2" /></label>
              <label>Timezone
                <select name="timezone" defaultValue={settings.timezone} data-testid="auto-run-tz" className="mt-1 w-full rounded-xl border p-2">
                  {(TIMEZONES.includes(settings.timezone) ? TIMEZONES : [settings.timezone, ...TIMEZONES]).map((z) => <option key={z} value={z}>{TZ_LABEL[z] ?? z} · {z}</option>)}
                </select>
              </label>
            </div>
            <p className="text-xs text-muted" data-testid="next-run">
              {settings.autoRun ? `Next run: ${nextRun}. ` : "Daily run is off. "}
              Precision: this project is on Vercel&apos;s Hobby plan, whose cron can only fire once per day per schedule and anywhere within the scheduled hour. JobPilot checks every hour, so your run starts at the first check after {hhmm} ({settings.timezone}),
              typically up to ~2 hours late, never early; if a check is missed it catches up for up to {CATCH_UP_MIN / 60} hours. Exact-minute runs need Vercel Pro. Results appear here as a notification{" "}
              (and by email once a mailer is configured).
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label>Target roles (comma-separated)<input name="targetRoles" defaultValue={prefs?.targetRoles.join(", ") ?? ""} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label>Locations: cities or countries (comma-separated)<input name="locations" placeholder="Bengaluru, Hyderabad" defaultValue={prefs?.locations.join(", ") ?? ""} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label>Only roles posted within the last (days)<input name="freshnessDays" type="number" min={1} max={30} defaultValue={settings.freshnessDays} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label>Score threshold<input name="threshold" type="number" min={0} max={100} defaultValue={settings.threshold} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label>Employer boards per run (max 300)<input name="companiesPerRun" type="number" min={1} max={300} defaultValue={settings.companiesPerRun} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label>Home country<input name="homeCountry" defaultValue={settings.homeCountry} className="mt-1 w-full rounded-xl border p-2" /></label>
            <label className="sm:col-span-2">Allowed countries (comma-separated)<input name="allowedCountries" defaultValue={settings.allowedCountries.join(", ")} className="mt-1 w-full rounded-xl border p-2" /></label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Switch name="remoteHome" defaultChecked={prefs?.remoteIndia !== false} label="Include remote roles in my home country" />
            <Switch name="remoteAbroad" defaultChecked={settings.remoteAbroad} label="Include remote roles based abroad" />
            <Switch name="hybridAbroad" defaultChecked={settings.hybridAbroad} label="Include hybrid roles abroad (otherwise only if I picked that city)" />
            <Switch name="includeUnknownDate" defaultChecked={settings.includeUnknownDate} label="Include roles with no posting date (labelled “date unknown”)" />
            <Switch name="needsSponsorship" defaultChecked={settings.needsSponsorship} label="I need visa sponsorship outside my home country" />
            <Switch name="allowUsWithSponsorship" defaultChecked={settings.allowUsWithSponsorship} label="Include US roles only when the posting mentions visa sponsorship" />
          </div>
          <p className="text-xs text-muted">Onsite and hybrid roles are only queued in cities or countries you listed above; with no locations set, your home country counts as everywhere.</p>
          <button data-testid="save-settings" className="h-10 w-fit rounded-full bg-indigo px-5 font-bold text-white">Save</button>
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
