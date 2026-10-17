"use client";

import { useActionState, useState } from "react";
import { submitUtrAction } from "@/server/upi-actions";

export function CopyVpa({ vpa }: { vpa: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      data-testid="copy-vpa"
      className="rounded-full border-2 border-indigo px-3 py-1 text-sm font-bold text-indigo"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(vpa);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function UtrForm({ paymentRef }: { paymentRef: string }) {
  const [state, action, pending] = useActionState(submitUtrAction, null);
  if (state?.ok) return <p role="status" data-testid="utr-ok" className="rounded-2xl bg-teal-soft px-4 py-3 text-sm font-semibold">{state.message}</p>;
  return (
    <form action={action} className="space-y-2" data-testid="utr-form">
      <input type="hidden" name="ref" value={paymentRef} />
      <label className="block text-sm font-semibold">
        12-digit UTR / UPI reference number
        <input name="utr" required inputMode="numeric" pattern="\d{12}" maxLength={14} placeholder="e.g. 412345678901" className="mt-1 w-full rounded-xl border p-2" />
      </label>
      {state && !state.ok ? <p role="alert" className="rounded-xl bg-coral-soft p-2 text-sm font-semibold">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="h-11 rounded-full bg-indigo px-6 font-bold text-white disabled:opacity-50">
        {pending ? "Submitting…" : "Submit payment for verification"}
      </button>
    </form>
  );
}
