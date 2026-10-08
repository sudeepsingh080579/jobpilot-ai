"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { NicheInput } from "@/lib/inputs";
import { acceptNicheSuggestion, saveNiche, scoreSavedJobs, suggestNiches } from "@/server/strategy-actions";
import { useRun } from "@/components/use-run";

type Suggestion = {
  name: string;
  title: string;
  aliases: string[];
  industries: string[];
  seniority: string;
  companyTypes: string[];
  locations: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  why: string;
  payBenchmark: string;
};

export function StrategyStudio({ initial, hasJobs }: { initial: NicheInput | null; hasJobs: boolean }) {
  const { error, pending, run } = useRun();
  const [form, setForm] = useState<NicheInput>(
    initial ?? {
      name: "Cloud platform leadership",
      title: "",
      aliases: "",
      industries: "",
      seniority: "Director",
      roleCategory: "Engineering leadership",
      functionName: "Platform",
      companyTypes: "",
      locations: "",
      workModes: "hybrid, remote",
      targetCompanies: "",
      includeKeywords: "",
      excludeKeywords: "",
      why: "",
      payBenchmark: "",
      isPrimary: true,
    },
  );
  const [ideas, setIdeas] = useState<Suggestion[]>([]);

  function set<K extends keyof NicheInput>(key: K, value: NicheInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const fields: { key: keyof NicheInput; label: string; hint?: string }[] = [
    { key: "name", label: "Niche name" },
    { key: "title", label: "Primary title", hint: "The title you want a recruiter to repeat." },
    { key: "aliases", label: "Title aliases" },
    { key: "industries", label: "Industries" },
    { key: "seniority", label: "Seniority" },
    { key: "roleCategory", label: "Role category" },
    { key: "functionName", label: "Function" },
    { key: "companyTypes", label: "Company types" },
    { key: "locations", label: "Locations" },
    { key: "workModes", label: "Work modes" },
    { key: "targetCompanies", label: "Target companies" },
    { key: "includeKeywords", label: "Keywords to include" },
    { key: "excludeKeywords", label: "Keywords to exclude" },
    { key: "payBenchmark", label: "Pay benchmark" },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <form
        className="desk-card space-y-3 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => saveNiche(form));
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="text-sm">
              {field.label}
              <input className="field mt-1" value={String(form[field.key] ?? "")} onChange={(event) => set(field.key, event.target.value)} />
              {field.hint ? <span className="mt-1 block text-xs text-muted">{field.hint}</span> : null}
            </label>
          ))}
        </div>
        <label className="block text-sm">
          Why this niche
          <textarea className="field mt-1 min-h-20" value={form.why} onChange={(event) => set("why", event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isPrimary} onChange={(event) => set("isPrimary", event.target.checked)} />
          Primary niche
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>Save niche</Button>
          <Button type="button" variant="outline" disabled={pending || !hasJobs} onClick={() => run(() => scoreSavedJobs())}>
            Score saved jobs
          </Button>
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </form>
      <aside className="space-y-3">
        <div className="desk-card p-4">
          <h2 className="font-serif text-2xl">Suggestions</h2>
          <p className="mt-1 text-sm text-muted">Three niches with a reason and a pay band. Save one as primary if it fits.</p>
          <Button className="mt-3" variant="outline" disabled={pending} onClick={() => run(() => suggestNiches(), setIdeas)}>
            Suggest niches
          </Button>
        </div>
        {ideas.map((idea) => (
          <article key={idea.title} className="desk-card p-4">
            <h3 className="font-medium">{idea.title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted">{idea.why}</p>
            <p className="mt-2 text-xs text-brass">{idea.payBenchmark}</p>
            <Button className="mt-3" size="sm" onClick={() => run(() => acceptNicheSuggestion(idea))}>
              Use this niche
            </Button>
          </article>
        ))}
      </aside>
    </div>
  );
}
