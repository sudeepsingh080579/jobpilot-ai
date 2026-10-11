"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { COMPANY_STAGES, CONTACT_TYPES, OUTREACH_STEPS } from "@/lib/domain";
import { createDeck, generatePosts, researchCompany, rewriteProfile, savePost } from "@/server/material-actions";
import { draftOutreach, markDraftCopied, saveCompany, saveContact, saveTemplate } from "@/server/pipeline-actions";
import { logoutAction } from "@/server/auth-actions";
import { deleteAccountAction } from "@/server/privacy-actions";
import { dispatchDueReminders, saveReminder, toggleReminder, updateProfile } from "@/server/account-actions";
import { deleteCar, masterResumeFromCar, saveCar, suggestCar } from "@/server/strategy-actions";
import { useRun } from "@/components/use-run";

export function CompanyBoard({
  companies,
}: {
  companies: { id: string; name: string; industry: string; website: string; location: string; status: string; notes: string; problems: { title: string; detail: string }[] }[];
}) {
  const { error, pending, run } = useRun();
  const [form, setForm] = useState({ name: "", industry: "", website: "", location: "", notes: "" });
  return (
    <div className="space-y-4">
      <form className="desk-card grid gap-2 p-4 md:grid-cols-3" onSubmit={(e) => { e.preventDefault(); run(() => saveCompany(form), () => setForm({ name: "", industry: "", website: "", location: "", notes: "" })); }}>
        <input className="field" placeholder="Company" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input className="field" placeholder="Industry" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
        <input className="field" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <input className="field md:col-span-2" placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <Button type="submit" disabled={pending}>Add company</Button>
      </form>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COMPANY_STAGES.map((stage) => (
          <section key={stage.id} className="w-72 shrink-0 rounded-2xl bg-[#ebe4d6] p-2">
            <h2 className="px-2 py-1 text-sm font-medium">{stage.label}</h2>
            {companies.filter((company) => company.status === stage.id).map((company) => (
              <article key={company.id} className="desk-card mb-2 p-3 text-sm">
                <p className="font-medium">{company.name}</p>
                <p className="text-muted">{company.industry} · {company.location}</p>
                <select className="field mt-2" value={company.status} onChange={(e) => run(() => saveCompany({ id: company.id, name: company.name, industry: company.industry, website: company.website, location: company.location, notes: company.notes, status: e.target.value }))}>
                  {COMPANY_STAGES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
                <ul className="mt-2 space-y-1 text-xs text-muted">
                  {company.problems.slice(0, 2).map((problem) => <li key={problem.title}>{problem.title}</li>)}
                </ul>
                <Button className="mt-2" size="sm" variant="outline" disabled={pending} onClick={() => run(() => researchCompany(company.id, company.notes))}>Research problems</Button>
              </article>
            ))}
          </section>
        ))}
      </div>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function PitchSetup({ companies }: { companies: { id: string; name: string; problems: { title: string; detail: string }[] }[] }) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const company = companies.find((item) => item.id === companyId);
  const [problem, setProblem] = useState(company?.problems[0]?.title ?? "");
  const [proof, setProof] = useState("");
  const [name, setName] = useState(company?.name ?? "");
  return (
    <form className="desk-card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); run(() => createDeck({ companyId: companyId || undefined, companyName: name, problem, proof }), (data) => router.push(`/pitch/${data.id}`)); }}>
      <label className="block text-sm">Company
        <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label className="block text-sm">From your board
        <select className="field mt-1" value={companyId} onChange={(e) => { setCompanyId(e.target.value); const next = companies.find((item) => item.id === e.target.value); setName(next?.name ?? name); setProblem(next?.problems[0]?.title ?? ""); }}>
          <option value="">Type a name instead</option>
          {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {company?.problems.length ? (
        <div className="space-y-2">
          {company.problems.map((item) => (
            <label key={item.title} className="flex gap-2 text-sm">
              <input type="radio" name="problem" checked={problem === item.title} onChange={() => setProblem(item.title)} />
              <span><span className="font-medium">{item.title}.</span> {item.detail}</span>
            </label>
          ))}
        </div>
      ) : <textarea className="field min-h-20" placeholder="The problem you want the deck to own" value={problem} onChange={(e) => setProblem(e.target.value)} />}
      <textarea className="field min-h-16" placeholder="A proof point from your own work" value={proof} onChange={(e) => setProof(e.target.value)} />
      <Button type="submit" disabled={pending}>Generate slides</Button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}

export function NetworkDesk({
  contacts,
  templates,
  companies,
  jobs,
  presetJob,
}: {
  contacts: { id: string; name: string; title: string; type: string; company: string; step: string }[];
  templates: { step: string; body: string }[];
  companies: { id: string; name: string }[];
  jobs: { id: string; title: string; company: string }[];
  presetJob?: string;
}) {
  const { error, pending, run } = useRun();
  const [form, setForm] = useState({ name: "", title: "", email: "", linkedin: "", type: "POTENTIAL_REFERRER", companyId: companies[0]?.id ?? "", jobId: presetJob ?? "", notes: "", tags: "" });
  const [bodies, setBodies] = useState<Record<string, string>>(Object.fromEntries(templates.map((item) => [item.step, item.body])));
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-copper/40 bg-[#f8ebe4] px-4 py-3 text-sm">
        Drafts only. {`JobPilot never sends a note or a connection request. Copy the text and send it yourself.`}
      </div>
      <form className="desk-card grid gap-2 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => saveContact(form)); }}>
        <input className="field" placeholder="Name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="field" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="field" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input className="field" placeholder="LinkedIn URL" value={form.linkedin} onChange={(e) => setForm({ ...form, linkedin: e.target.value })} />
        <select className="field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          {CONTACT_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
        </select>
        <select className="field" value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value })}>
          <option value="">No company</option>
          {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
        <select className="field" value={form.jobId} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
          <option value="">No role</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.company} — {job.title}</option>)}
        </select>
        <input className="field" placeholder="Up to 4 tags, comma separated" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <Button type="submit" disabled={pending}>Add contact</Button>
      </form>
      <div className="grid gap-3 md:grid-cols-2">
        {contacts.map((contact) => (
          <a key={contact.id} href={`/network/${contact.id}`} className="desk-card p-4">
            <p className="font-medium">{contact.name}</p>
            <p className="text-sm text-muted">{contact.title} · {contact.company}</p>
            <p className="mt-1 text-xs text-brass">{contact.type} · next {contact.step}</p>
          </a>
        ))}
      </div>
      <details className="desk-card p-4">
        <summary className="cursor-pointer font-medium">Edit the four templates</summary>
        <div className="mt-3 space-y-3">
          {OUTREACH_STEPS.map((step) => (
            <label key={step.id} className="block text-sm">
              {step.label}
              <textarea className="field mt-1 min-h-20" value={bodies[step.id] ?? ""} onChange={(e) => setBodies({ ...bodies, [step.id]: e.target.value })} />
              <Button className="mt-2" size="sm" variant="outline" disabled={pending} onClick={() => run(() => saveTemplate(step.id, bodies[step.id] ?? ""))}>Save template</Button>
            </label>
          ))}
        </div>
      </details>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function Sequence({ contactId, messages }: { contactId: string; messages: { id: string; step: string; body: string; status: string }[] }) {
  const { error, pending, run } = useRun();
  const [local, setLocal] = useState<Record<string, string>>({});
  return (
    <div className="space-y-3">
      {OUTREACH_STEPS.map((step, index) => {
        const message = messages.find((item) => item.step === step.id);
        const body = local[step.id] ?? message?.body ?? "";
        return (
          <article key={step.id} className="desk-card p-4">
            <p className="text-xs uppercase tracking-[0.14em] text-brass">Step {index + 1}</p>
            <h2 className="font-serif text-2xl">{step.label}</h2>
            <p className="text-sm text-muted">{step.hint}</p>
            {body ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6">{body}</p> : <p className="mt-3 text-sm text-muted">No draft yet.</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" disabled={pending} onClick={() => run(() => draftOutreach(contactId, step.id), (data) => setLocal((current) => ({ ...current, [step.id]: data.body })))}>Draft</Button>
              {message ? (
                <Button size="sm" variant="outline" onClick={async () => { await navigator.clipboard.writeText(body); run(() => markDraftCopied(message.id)); }}>
                  Copy · stays a draft
                </Button>
              ) : null}
              {message ? <span className="text-xs text-muted">{message.status}</span> : null}
            </div>
          </article>
        );
      })}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function PresenceStudio({
  posts,
  pasted,
  headline,
  about,
}: {
  posts: { id: string; theme: string; content: string }[];
  pasted: string;
  headline: string;
  about: string;
}) {
  const { error, pending, run } = useRun();
  const [profile, setProfile] = useState(pasted);
  const [drafts, setDrafts] = useState(posts);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">Three drafts for the week. Publish them yourself.</p>
        <Button disabled={pending} onClick={() => run(() => generatePosts())}>Draft this week</Button>
      </div>
      {drafts.length === 0 ? <p className="text-sm text-muted">No posts for this week yet.</p> : null}
      {drafts.map((post) => (
        <article key={post.id} className="desk-card p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-brass">{post.theme}</p>
          <textarea className="field mt-2 min-h-36" value={post.content} onChange={(e) => setDrafts((items) => items.map((item) => item.id === post.id ? { ...item, content: e.target.value } : item))} />
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => savePost(post.id, post.content))}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard.writeText(post.content)}>Copy</Button>
          </div>
        </article>
      ))}
      <form className="desk-card space-y-3 p-4" onSubmit={(e) => { e.preventDefault(); run(() => rewriteProfile(profile)); }}>
        <h2 className="font-serif text-2xl">Headline and About</h2>
        <textarea className="field min-h-28" value={profile} onChange={(e) => setProfile(e.target.value)} placeholder="Paste your current headline and About" />
        <Button type="submit" disabled={pending}>Suggest a rewrite</Button>
        {headline ? <p className="text-sm"><span className="font-medium">Headline. </span>{headline}</p> : null}
        {about ? <p className="whitespace-pre-wrap text-sm leading-6">{about}</p> : null}
      </form>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function CarStudio({ notes }: { notes: { id: string; company: string; role: string; challenge: string; action: string; result: string; resumeBullet: string }[] }) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const blank = { company: "", role: "", challenge: "", action: "", result: "", skills: "kubernetes, leadership", resumeBullet: "" };
  const [form, setForm] = useState(blank);
  return (
    <div className="space-y-4">
      <form className="desk-card grid gap-2 p-4" onSubmit={(e) => { e.preventDefault(); run(() => saveCar(form), () => setForm(blank)); }}>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="field" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
          <input className="field" placeholder="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
        </div>
        <textarea className="field min-h-16" placeholder="Challenge" value={form.challenge} onChange={(e) => setForm({ ...form, challenge: e.target.value })} />
        <textarea className="field min-h-16" placeholder="Action" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} />
        <textarea className="field min-h-16" placeholder="Result" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
        <input className="field" placeholder="Resume bullet" value={form.resumeBullet} onChange={(e) => setForm({ ...form, resumeBullet: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>Save note</Button>
          <Button type="button" variant="outline" disabled={pending} onClick={() => run(() => suggestCar(form.company || "the last company", form.role || "Director"), (data) => {
            const first = data[0];
            if (!first) return;
            setForm({ ...form, challenge: first.challenge, action: first.action, result: first.result, resumeBullet: first.bullet });
          })}>Suggest a scenario</Button>
          <Button type="button" variant="copper" disabled={pending} onClick={() => run(() => masterResumeFromCar(), (data) => router.push(`/resumes/${data.id}`))}>Build master resume</Button>
        </div>
      </form>
      {notes.map((note) => (
        <article key={note.id} className="desk-card p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-medium">{note.role} · {note.company}</h2>
            <button type="button" className="text-xs text-bad" onClick={() => run(() => deleteCar(note.id))}>Delete</button>
          </div>
          <p className="mt-2"><span className="text-muted">Challenge. </span>{note.challenge}</p>
          <p><span className="text-muted">Action. </span>{note.action}</p>
          <p><span className="text-muted">Result. </span>{note.result}</p>
          {note.resumeBullet ? <p className="mt-2 text-pine">{note.resumeBullet}</p> : null}
        </article>
      ))}
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

export function ReminderDesk({
  items,
  jobs,
  pushKey,
}: {
  items: { id: string; title: string; body: string; dueAt: string; done: boolean }[];
  jobs: { id: string; title: string; company: string }[];
  pushKey: string;
}) {
  const { error, pending, run } = useRun();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [jobId, setJobId] = useState("");
  const [pushNote, setPushNote] = useState("");

  async function enablePush() {
    if (!pushKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushNote("This browser will use the in-app list instead of system notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setPushNote("Permission was not granted. Reminders still show in the app.");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(pushKey) });
    const json = subscription.toJSON();
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(json),
    });
    setPushNote("System notifications are on for this browser. The in-app list still works if they do not.");
  }

  return (
    <div className="space-y-4">
      <div className="desk-card p-4 text-sm">
        <p>Follow-ups show here when they are due. Web Push is used when the browser allows it.</p>
        <Button className="mt-3" variant="outline" onClick={() => { enablePush().catch(() => setPushNote("Could not enable push. The in-app list is the fallback.")); run(() => dispatchDueReminders()); }}>
          {pushKey ? "Enable notifications" : "Use in-app reminders"}
        </Button>
        {pushNote ? <p className="mt-2 text-muted">{pushNote}</p> : null}
      </div>
      <form className="desk-card grid gap-2 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => saveReminder({ title, body, dueAt, jobId })); }}>
        <input className="field" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input className="field" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
        <input className="field md:col-span-2" placeholder="Note" value={body} onChange={(e) => setBody(e.target.value)} />
        <select className="field" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">No role</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.company}</option>)}
        </select>
        <Button type="submit" disabled={pending}>Add reminder</Button>
      </form>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="desk-card flex items-center justify-between gap-3 p-3 text-sm">
            <div>
              <p className={item.done ? "line-through" : "font-medium"}>{item.title}</p>
              <p className="text-muted">{new Date(item.dueAt).toLocaleString()} {item.body}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => run(() => toggleReminder(item.id, !item.done))}>{item.done ? "Reopen" : "Done"}</Button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i);
  return output;
}

export function SettingsForm({
  profile,
  mode,
  providers,
}: {
  profile: { name: string; headline: string; location: string; yearsExperience: number; currentTitle: string; seniority: string; targetCompensation: string; timezone: string; currency: string; email: string };
  mode: string;
  providers: { name: string; configured: boolean; note: string }[];
}) {
  const { error, pending, run } = useRun();
  const [form, setForm] = useState(profile);
  return (
    <div className="space-y-4">
      <form className="desk-card grid gap-3 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => updateProfile(form)); }}>
        <label className="text-sm">Name<input className="field mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        <label className="text-sm">Email<input className="field mt-1" value={form.email} disabled /></label>
        <label className="text-sm">Current title<input className="field mt-1" value={form.currentTitle} onChange={(e) => setForm({ ...form, currentTitle: e.target.value })} /></label>
        <label className="text-sm">Headline<input className="field mt-1" value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} /></label>
        <label className="text-sm">Location<input className="field mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
        <label className="text-sm">Seniority<input className="field mt-1" value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value })} /></label>
        <label className="text-sm">Years<input className="field mt-1" type="number" value={form.yearsExperience} onChange={(e) => setForm({ ...form, yearsExperience: Number(e.target.value) })} /></label>
        <label className="text-sm">Timezone<input className="field mt-1" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} /></label>
        <label className="text-sm">Currency<select className="field mt-1" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <label className="text-sm">Target compensation<input className="field mt-1" placeholder="e.g. 180,000 base + equity" value={form.targetCompensation} onChange={(e) => setForm({ ...form, targetCompensation: e.target.value })} /></label>
        <Button type="submit" disabled={pending}>Save profile</Button>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </form>
      <section className="desk-card p-4 text-sm">
        <h2 className="font-serif text-2xl">What is live</h2>
        <p className="mt-2">Writing model: {mode === "live" ? "connected" : "mock — no LLM_API_KEY"}.</p>
        <ul className="mt-2 space-y-1">
          {providers.map((provider) => <li key={provider.name}>{provider.name}: {provider.configured ? "configured" : provider.note}</li>)}
        </ul>
        <ul className="mt-3 space-y-1 text-muted">
          <li>A browser extension can later POST to /api/extensions/jobs. That route answers 501.</li>
          <li>LinkedIn sending is off. Outreach is copy-only.</li>
          <li>No camera analysis and no coach booking.</li>
        </ul>
      </section>
      <section className="desk-card space-y-3 p-4 text-sm" data-testid="privacy-controls">
        <h2 className="text-2xl font-bold">Billing and your data</h2>
        <div className="flex flex-wrap gap-2">
          <a className="rounded-full bg-sun px-4 py-2 font-bold text-ink" href="/settings/billing">Plan and billing</a>
          <a className="rounded-full border border-line px-4 py-2 font-semibold" href="/api/account/export" data-testid="export-data">Download my data</a>
        </div>
        <DeleteAccount />
      </section>
      <form action={logoutAction}>
        <Button variant="outline" type="submit">Sign out</Button>
      </form>
    </div>
  );
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "INR", "SGD", "AED", "JPY", "CHF", "SEK", "BRL", "MXN", "ZAR"];

function DeleteAccount() {
  const [confirm, setConfirm] = useState("");
  return (
    <form action={deleteAccountAction} className="rounded-2xl border border-bad/40 p-3">
      <p className="font-semibold text-bad">Delete account</p>
      <p className="mt-1 text-muted">This permanently deletes your account and everything in it, and cancels any subscription. It cannot be undone.</p>
      <label className="mt-2 block">
        Type DELETE to confirm
        <input className="field mt-1" name="confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="delete-confirm" />
      </label>
      <Button type="submit" variant="outline" className="mt-2" disabled={confirm !== "DELETE"}>Delete my account</Button>
    </form>
  );
}
