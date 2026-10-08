"use client";

export default function DeskError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="desk-card p-6">
      <h1 className="font-serif text-3xl">This page did not load</h1>
      <p className="mt-2 text-sm text-muted">{error.message || "Something on the desk failed."}</p>
      <button className="mt-4 rounded-lg bg-pine px-4 py-2 text-sm text-cream" onClick={reset} type="button">
        Try again
      </button>
    </div>
  );
}
