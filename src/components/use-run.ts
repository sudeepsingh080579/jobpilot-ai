"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Result } from "@/server/result";

export function useRun() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  function run<T>(task: () => Promise<Result<T>>, onOk?: (data: T) => void) {
    setError("");
    start(async () => {
      const result = await task();
      if (!result.ok) {
        const upgrade = result.error.endsWith("[upgrade]");
        const message = result.error.replace(/\s*\[upgrade\]$/, "");
        setError(message);
        if (upgrade && typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("jobpilot:upgrade", { detail: message }));
        }
        return;
      }
      onOk?.(result.data);
      router.refresh();
    });
  }

  return { error, pending, run, setError };
}
