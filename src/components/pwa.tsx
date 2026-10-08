"use client";

import { useEffect } from "react";

export function RegisterSw() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const script = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw-dev.js";
    navigator.serviceWorker.register(script).catch(() => undefined);
  }, []);
  return null;
}

export function SnapshotWriter({ snapshot }: { snapshot: unknown }) {
  useEffect(() => {
    if (!("caches" in window)) return;
    const write = async () => {
      const cache = await caches.open("jobpilot-data-v1");
      await cache.put("/offline/snapshot", new Response(JSON.stringify({ savedAt: new Date().toISOString(), snapshot }), { headers: { "Content-Type": "application/json" } }));
    };
    write().catch(() => undefined);
  }, [snapshot]);
  return null;
}

export function DueReminders() {
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { dispatchDueReminders } = await import("@/server/account-actions");
      const result = await dispatchDueReminders();
      if (cancelled || !result.ok || result.data.reminders.length === 0) return;
      const note = document.getElementById("due-banner");
      if (note) {
        note.textContent = result.data.reminders.map((item) => item.title).join(" · ");
        note.parentElement?.classList.remove("hidden");
      }
    };
    run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="mb-4 hidden rounded-xl border border-copper/30 bg-[#f8ebe4] px-4 py-3 text-sm">
      <p className="font-medium text-copper">Due now</p>
      <p id="due-banner" className="text-ink" />
      <a className="mt-1 inline-block text-pine underline" href="/reminders">
        Open reminders
      </a>
    </div>
  );
}
