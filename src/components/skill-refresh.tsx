"use client";

import { Button } from "@/components/ui/button";
import { refreshSkillMap } from "@/server/strategy-actions";
import { useRun } from "@/components/use-run";

export function SkillRefresh() {
  const { error, pending, run } = useRun();
  return (
    <div>
      <Button disabled={pending} onClick={() => run(() => refreshSkillMap())}>Refresh from saved roles</Button>
      {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
    </div>
  );
}
