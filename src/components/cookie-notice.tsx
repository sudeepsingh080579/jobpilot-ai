"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

const KEY = "jobpilot-cookie-notice";
const EVENT = "jobpilot:cookie-notice";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function seen() {
  try {
    return Boolean(localStorage.getItem(KEY));
  } catch {
    return true; // Storage blocked: do not nag.
  }
}

/** Essential-cookies-only notice. If you add analytics or ads, replace this with a real consent banner. */
export function CookieNotice() {
  const dismissed = useSyncExternalStore(subscribe, seen, () => true);
  if (dismissed) return null;
  return (
    <div role="region" aria-label="Cookie notice" data-testid="cookie-notice" className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-xl rounded-2xl bg-ink px-4 py-3 text-sm text-white shadow-lg md:bottom-4">
      <p>
        We only use essential cookies to keep you signed in and secure. No advertising cookies. <Link href="/privacy" className="underline">Privacy Policy</Link>
      </p>
      <button
        type="button"
        data-testid="cookie-ok"
        className="mt-2 rounded-full bg-sun px-4 py-1.5 font-bold text-ink"
        onClick={() => {
          try {
            localStorage.setItem(KEY, new Date().toISOString());
          } catch {}
          window.dispatchEvent(new Event(EVENT));
        }}
      >
        OK
      </button>
    </div>
  );
}
