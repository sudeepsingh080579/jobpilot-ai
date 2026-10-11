"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

/** Listens for "jobpilot:upgrade" (fired by useRun when a server gate says no) and shows one friendly prompt. */
export function UpgradePrompt() {
  const [message, setMessage] = useState("");
  useEffect(() => {
    const onUpgrade = (event: Event) => setMessage((event as CustomEvent<string>).detail || "This is part of Pro.");
    window.addEventListener("jobpilot:upgrade", onUpgrade);
    return () => window.removeEventListener("jobpilot:upgrade", onUpgrade);
  }, []);
  if (!message) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="upgrade-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/40 px-4" data-testid="upgrade-prompt">
      <div className="relative w-full max-w-md rounded-3xl bg-paper p-6 shadow-xl">
        <button aria-label="Close" className="absolute right-4 top-4 text-muted" onClick={() => setMessage("")}>
          <X className="size-5" />
        </button>
        <span className="grid size-12 place-items-center rounded-2xl bg-sun text-ink">
          <Sparkles className="size-6" />
        </span>
        <h2 id="upgrade-title" className="mt-4 text-2xl font-bold">Unlock Pro</h2>
        <p className="mt-2 text-muted">{message}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/pricing" onClick={() => setMessage("")} className="inline-flex h-12 flex-1 items-center justify-center rounded-full bg-sun font-bold text-ink">
            See plans
          </Link>
          <button onClick={() => setMessage("")} className="h-12 flex-1 rounded-full border border-line font-semibold">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
