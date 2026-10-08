"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";

type Snapshot = {
  name?: string;
  headline?: string;
  plan?: { title: string; detail: string }[];
  jobs?: { title: string; company: string; status: string }[];
  resume?: { title: string; score: number | null } | null;
};

export default function OfflinePage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!("caches" in window)) return;
      const cache = await caches.open("jobpilot-data-v1");
      const response = await cache.match("/offline/snapshot");
      if (!response) return;
      const body = (await response.json()) as { savedAt?: string; snapshot?: Snapshot };
      setSavedAt(body.savedAt ?? "");
      setSnapshot(body.snapshot ?? null);
    };
    load().catch(() => undefined);
  }, []);

  return (
    <main className="mx-auto max-w-xl px-5 py-10">
      <p className="text-xs uppercase tracking-[0.16em] text-brass">{brand.shortName} · offline</p>
      <h1 className="mt-2 font-serif text-4xl">You are offline</h1>
      <p className="mt-2 text-sm text-muted">The app shell is here. The last desk you opened is below, if this browser cached it.</p>
      {!snapshot ? <p className="mt-6 text-sm">No cached desk yet. Open the dashboard once while online.</p> : null}
      {snapshot ? (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted">Saved {savedAt ? new Date(savedAt).toLocaleString() : "earlier"} for {snapshot.name}</p>
          <ul className="space-y-2">
            {snapshot.plan?.map((item) => (
              <li key={item.title} className="desk-card p-3 text-sm">
                <p className="font-medium">{item.title}</p>
                <p className="text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
          {snapshot.resume ? <p className="text-sm">Resume {snapshot.resume.title}: {snapshot.resume.score}</p> : null}
          <ul className="text-sm">
            {snapshot.jobs?.map((job) => (
              <li key={`${job.company}-${job.title}`}>{job.status} · {job.title} at {job.company}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </main>
  );
}
