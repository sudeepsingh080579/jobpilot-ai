"use client";

import { Button } from "@/components/ui/button";
import { buildSwot } from "@/server/strategy-actions";
import { useRun } from "@/components/use-run";

export function SwotButton() {
  const { error, pending, run } = useRun();
  return (
    <div>
      <Button disabled={pending} onClick={() => run(() => buildSwot())}>Build SWOT</Button>
      {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
    </div>
  );
}
