"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LETTER_TEMPLATES } from "@/lib/domain";
import { analyzeAnswer } from "@/lib/scoring/interview";
import { saveLetter } from "@/server/material-actions";
import { finishInterview, finishNegotiation, negotiationTurn, saveInterviewAnswer, startInterview, startNegotiation } from "@/server/practice-actions";
import { useRun } from "@/components/use-run";

type Question = {
  id: string;
  prompt: string;
  lookFor: string[];
  answer: string;
  durationSec: number;
  analysis: { content: number; fillerCount: number; wpm: number; paceNote: string; fillers: { phrase: string; count: number }[] } | null;
  coaching: string;
  alternate: string;
};

export function InterviewSetup({ jobs }: { jobs: { id: string; title: string; company: string }[] }) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const [title, setTitle] = useState("Director conversation");
  const [mode, setMode] = useState("behavioral");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [custom, setCustom] = useState("");
  return (
    <form
      className="desk-card space-y-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        run(() => startInterview({ title, mode, jobId, custom, useAi: mode === "ai" }), (data) => router.push(`/interview/${data.id}`));
      }}
    >
      <label className="block text-sm">Session title<input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="block text-sm">
        Source
        <select className="field mt-1" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="behavioral">Question bank · behavioral</option>
          <option value="technical">Question bank · technical</option>
          <option value="case">Question bank · case</option>
          <option value="mixed">Question bank · mixed</option>
          <option value="ai">Generate with the model</option>
        </select>
      </label>
      <label className="block text-sm">
        Role
        <select className="field mt-1" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">General practice</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.company} — {job.title}</option>)}
        </select>
      </label>
      <label className="block text-sm">Or type your own, one per line<textarea className="field mt-1 min-h-20" value={custom} onChange={(e) => setCustom(e.target.value)} /></label>
      <Button type="submit" disabled={pending}>Start session</Button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}

export function InterviewRunner({ sessionId, initial, report }: { sessionId: string; initial: Question[]; report: { content?: number; fillers?: number; wpm?: number; summary?: string } | null }) {
  const { error, pending, run } = useRun();
  const [questions, setQuestions] = useState(initial);
  const [index, setIndex] = useState(Math.max(0, initial.findIndex((item) => !item.answer)));
  const [answer, setAnswer] = useState(initial[index]?.answer ?? "");
  const [listening, setListening] = useState(false);
  const started = useRef<number | null>(null);
  const recognition = useRef<{ stop: () => void } | null>(null);
  const current = questions[index];

  function selectQuestion(questionIndex: number) {
    setIndex(questionIndex);
    setAnswer(questions[questionIndex]?.answer ?? "");
  }

  function begin() {
    if (!started.current) started.current = Date.now();
  }

  function toggleVoice() {
    const Speech = (window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRec }).webkitSpeechRecognition;
    if (!Speech) {
      setListening(false);
      return;
    }
    if (listening && recognition.current) {
      recognition.current.stop();
      setListening(false);
      return;
    }
    begin();
    const rec = new Speech();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let finalText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
      }
      if (finalText) setAnswer((value) => `${value} ${finalText}`.trim());
    };
    rec.start();
    recognition.current = rec;
    setListening(true);
  }

  if (!current) return null;
  const preview = analyzeAnswer(answer, current.durationSec, current.lookFor);

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <ol className="space-y-2">
        {questions.map((question, questionIndex) => (
          <li key={question.id}>
            <button type="button" className={`w-full rounded-lg px-3 py-2 text-left text-sm ${questionIndex === index ? "bg-pine text-cream" : "bg-paper"}`} onClick={() => selectQuestion(questionIndex)}>
              {questionIndex + 1}. {question.prompt.slice(0, 72)}
            </button>
          </li>
        ))}
      </ol>
      <section className="desk-card p-4">
        <h2 className="font-serif text-2xl">{current.prompt}</h2>
        <p className="mt-1 text-xs text-muted">Look for: {current.lookFor.join(", ") || "a result and a number"}</p>
        <textarea className="field mt-3 min-h-36" value={answer} onFocus={begin} onChange={(event) => { begin(); setAnswer(event.target.value); }} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={toggleVoice}>{listening ? "Stop mic" : "Answer by voice"}</Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              const durationSec = started.current ? Math.max(1, Math.round((Date.now() - started.current) / 1000)) : 45;
              run(() => saveInterviewAnswer({ sessionId, questionId: current.id, answer, durationSec }), (data) => {
                setQuestions((items) => items.map((item) => item.id === current.id ? { ...item, answer, durationSec, analysis: data.analysis, coaching: data.coaching, alternate: data.alternate } : item));
                started.current = null;
              });
            }}
          >
            Score this answer
          </Button>
          <Button type="button" variant="copper" disabled={pending} onClick={() => run(() => finishInterview(sessionId))}>Finish session</Button>
        </div>
        <p className="mt-3 text-sm text-muted">Live scan · content {preview.content}/10 · fillers {preview.fillerCount} · {preview.wpm ? `${preview.wpm} wpm` : "timer starts when you type or speak"}</p>
        {current.analysis ? (
          <div className="mt-3 rounded-lg bg-cream p-3 text-sm leading-6">
            <p>Content {current.analysis.content}/10. Fillers {current.analysis.fillerCount}. {current.analysis.paceNote}</p>
            <p className="mt-2">{current.coaching}</p>
            <p className="mt-2 text-muted">{current.alternate}</p>
          </div>
        ) : null}
        {report?.summary ? <p className="mt-3 text-sm">Session report: content {report.content}/10, fillers {report.fillers}, pace {report.wpm || "n/a"} wpm. {report.summary}</p> : null}
        {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
        <p className="mt-3 text-xs text-muted">Voice uses the browser speech API. If the mic button does nothing, this browser does not expose it — type the answer instead.</p>
      </section>
    </div>
  );
}

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: { resultIndex: number; results: { length: number; [index: number]: { isFinal: boolean; [index: number]: { transcript: string } } } }) => void;
  start: () => void;
  stop: () => void;
};

export function LetterEditor({ letter }: { letter: { id: string; title: string; template: string; content: string } }) {
  const { error, pending, run } = useRun();
  const [title, setTitle] = useState(letter.title);
  const [template, setTemplate] = useState(letter.template);
  const [content, setContent] = useState(letter.content);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="field" value={template} onChange={(e) => setTemplate(e.target.value)}>
          {LETTER_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
        <textarea className="field min-h-80" value={content} onChange={(e) => setContent(e.target.value)} />
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => run(() => saveLetter({ id: letter.id, title, template, content }))}>Save</Button>
          <a className="rounded-lg border border-line px-3 py-2 text-sm" href={`/print/letter/${letter.id}`} target="_blank" rel="noreferrer">Export PDF</a>
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </div>
      <article className={`bg-white p-8 text-sm leading-6 shadow-sm ${template === "brief" ? "text-[13px]" : ""} ${template === "plain" ? "" : "border-t-4 border-pine"}`}>
        <p className="font-serif text-2xl">{title}</p>
        <p className="mt-4 whitespace-pre-wrap">{content}</p>
      </article>
    </div>
  );
}

export function NegotiateSetup({ jobs }: { jobs: { id: string; title: string; company: string }[] }) {
  const router = useRouter();
  const { error, pending, run } = useRun();
  const [title, setTitle] = useState(jobs[0] ? `${jobs[0].title} at ${jobs[0].company}` : "Offer");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const [target, setTarget] = useState("$260k total");
  const [floor, setFloor] = useState("$230k total");
  const [offer, setOffer] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  return (
    <form className="desk-card grid gap-3 p-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => startNegotiation({ title, jobId, target, floor, offer, difficulty }), (data) => router.push(`/negotiate/${data.id}`)); }}>
      <label className="text-sm md:col-span-2">Title<input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label className="text-sm">Target<input className="field mt-1" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
      <label className="text-sm">Floor<input className="field mt-1" value={floor} onChange={(e) => setFloor(e.target.value)} /></label>
      <label className="text-sm">Current offer<input className="field mt-1" value={offer} onChange={(e) => setOffer(e.target.value)} /></label>
      <label className="text-sm">
        Pushback
        <select className="field mt-1" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="easy">Gentle</option>
          <option value="medium">Firm</option>
          <option value="hard">Hard</option>
        </select>
      </label>
      <label className="text-sm md:col-span-2">
        Saved role
        <select className="field mt-1" value={jobId} onChange={(e) => setJobId(e.target.value)}>
          <option value="">None</option>
          {jobs.map((job) => <option key={job.id} value={job.id}>{job.company}</option>)}
        </select>
      </label>
      <Button type="submit" disabled={pending}>Write the script and start</Button>
      {error ? <p className="text-sm text-bad">{error}</p> : null}
    </form>
  );
}

export function NegotiateRunner({
  sessionId,
  script,
  initial,
  report,
}: {
  sessionId: string;
  script: string;
  initial: { role: string; text: string }[];
  report: { overall?: number; summary?: string; notes?: string[] } | null;
}) {
  const { error, pending, run } = useRun();
  const [transcript, setTranscript] = useState(initial);
  const [text, setText] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <article className="desk-card p-4">
        <h2 className="font-serif text-2xl">Script</h2>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{script}</p>
      </article>
      <section className="desk-card p-4">
        <h2 className="font-serif text-2xl">Role-play</h2>
        <div className="mt-3 space-y-2">
          {transcript.map((turn, index) => (
            <p key={`${turn.role}-${index}`} className={`rounded-lg px-3 py-2 text-sm ${turn.role === "you" ? "bg-pine text-cream" : "bg-cream"}`}>
              <span className="block text-[11px] uppercase tracking-wider opacity-70">{turn.role}</span>
              {turn.text}
            </p>
          ))}
        </div>
        <textarea className="field mt-3 min-h-20" value={text} onChange={(e) => setText(e.target.value)} placeholder="Your reply" />
        <div className="mt-2 flex gap-2">
          <Button disabled={pending} onClick={() => run(() => negotiationTurn(sessionId, text), (data) => { setTranscript(data.transcript); setText(""); })}>Send</Button>
          <Button variant="outline" disabled={pending} onClick={() => run(() => finishNegotiation(sessionId))}>Score the conversation</Button>
        </div>
        {report?.summary ? (
          <div className="mt-3 text-sm">
            <p className="font-medium">Report {report.overall}/10</p>
            <p>{report.summary}</p>
            <ul className="mt-1 list-disc pl-4">{report.notes?.map((note) => <li key={note}>{note}</li>)}</ul>
          </div>
        ) : null}
        {error ? <p className="mt-2 text-sm text-bad">{error}</p> : null}
      </section>
    </div>
  );
}

type Slide = { id: string; kicker: string; title: string; body: string; bullets: string[] };

export function PitchEditor({ deckId, initial }: { deckId: string; initial: Slide[] }) {
  const { error, pending, run } = useRun();
  const [slides, setSlides] = useState(initial);
  const [active, setActive] = useState(0);
  const [instruction, setInstruction] = useState("");
  const slide = slides[active];
  if (!slide) return null;
  function update(partial: Partial<Slide>) {
    setSlides((current) => current.map((item, index) => (index === active ? { ...item, ...partial } : item)));
  }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2">
        {slides.map((item, index) => (
          <button key={item.id} type="button" className={`rounded-full px-3 py-1 text-xs ${index === active ? "bg-pine text-cream" : "bg-paper"}`} onClick={() => setActive(index)}>
            {index + 1}
          </button>
        ))}
        <a className="rounded-full border border-line px-3 py-1 text-xs" href={`/print/deck/${deckId}`} target="_blank" rel="noreferrer">Export PDF</a>
      </div>
      <article className="desk-card min-h-64 bg-pine-deep p-6 text-cream">
        <p className="text-xs uppercase tracking-[0.16em] text-cream/60">{slide.kicker}</p>
        <h2 className="mt-2 font-serif text-4xl">{slide.title}</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-cream/85">{slide.body}</p>
        <ul className="mt-4 space-y-1 text-sm">{slide.bullets.map((bullet) => <li key={bullet}>— {bullet}</li>)}</ul>
      </article>
      <div className="mt-3 grid gap-2">
        <input className="field" value={slide.title} onChange={(e) => update({ title: e.target.value })} />
        <textarea className="field min-h-20" value={slide.body} onChange={(e) => update({ body: e.target.value })} />
        <textarea className="field min-h-20" value={slide.bullets.join("\n")} onChange={(e) => update({ bullets: e.target.value.split("\n").filter(Boolean) })} />
        <input className="field" placeholder="Revise this slide: make the ask more specific" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
        <div className="flex gap-2">
          <Button variant="outline" disabled={pending} onClick={() => run(async () => {
            const { reviseSlide } = await import("@/server/material-actions");
            return reviseSlide({ deckId, slideId: slide.id, instruction });
          }, (data) => setSlides(data.slides))}>Revise with a prompt</Button>
          <Button disabled={pending} onClick={() => run(async () => {
            const { saveDeckSlides } = await import("@/server/material-actions");
            return saveDeckSlides(deckId, slides);
          })}>Save slides</Button>
        </div>
        {error ? <p className="text-sm text-bad">{error}</p> : null}
      </div>
    </div>
  );
}
