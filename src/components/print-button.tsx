"use client";

export function PrintButton() {
  return (
    <button className="no-print mb-4 rounded-lg bg-pine px-4 py-2 text-sm text-cream" type="button" onClick={() => window.print()}>
      Save as PDF
    </button>
  );
}
