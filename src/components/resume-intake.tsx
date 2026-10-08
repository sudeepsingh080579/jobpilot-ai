"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { parseResumeText } from "@/lib/resume/parse";
import { saveResume } from "@/server/material-actions";

export function ResumeIntake() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="space-y-3">
      <form
        className="desk-card p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          const body = new FormData(event.currentTarget);
          const response = await fetch("/api/resumes/upload", { method: "POST", body });
          const payload = (await response.json()) as { id?: string; error?: string };
          setPending(false);
          if (!response.ok || !payload.id) {
            setError(payload.error ?? "Upload failed");
            return;
          }
          router.push(`/resumes/${payload.id}`);
          router.refresh();
        }}
      >
        <h2 className="font-serif text-2xl">Upload</h2>
        <p className="mt-1 text-sm text-muted">PDF, DOCX, or TXT. 4 MB max. Parsing is best-effort — you can fix every field after.</p>
        <input className="mt-3 block w-full text-sm" name="file" type="file" accept=".pdf,.docx,.txt,application/pdf" required />
        <Button className="mt-3" type="submit" disabled={pending}>Upload and parse</Button>
      </form>
      <form
        className="desk-card p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          const content = parseResumeText(text);
          const result = await saveResume({ title: "Pasted resume", template: "ledger", isPrimary: false, content, rawText: text });
          setPending(false);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push(`/resumes/${result.data.id}`);
        }}
      >
        <h2 className="font-serif text-2xl">Paste</h2>
        <textarea className="field mt-3 min-h-32" value={text} onChange={(event) => setText(event.target.value)} placeholder="Paste the resume text" required />
        <Button className="mt-3" type="submit" disabled={pending}>Create from text</Button>
      </form>
      {error ? <p className="text-sm text-bad lg:col-span-2">{error}</p> : null}
    </div>
  );
}
