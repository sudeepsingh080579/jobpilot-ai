"use server";

import { revalidatePath } from "next/cache";
import { aiGate, meteredAi } from "@/server/billing";
import { parseJson, stringifyJson } from "@/lib/json";
import { pickQuestions } from "@/lib/interview/bank";
import { analyzeAnswer } from "@/lib/scoring/interview";
import { scoreNegotiation, type TranscriptTurn } from "@/lib/scoring/negotiation";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/server/result";
import { actionUser } from "@/server/session";

type StoredQuestion = {
  id: string;
  prompt: string;
  lookFor: string[];
  answer: string;
  durationSec: number;
  analysis: ReturnType<typeof analyzeAnswer> | null;
  coaching: string;
  alternate: string;
};

export async function startInterview(input: { title: string; mode: string; jobId?: string; custom?: string; useAi?: boolean }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "interview_questions");
  if (gate) return gate;
  let questions: { prompt: string; lookFor: string[] }[] = [];
  if (input.custom?.trim()) {
    questions = input.custom
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 5)
      .map((prompt) => ({ prompt, lookFor: ["result", "number"] }));
  } else if (input.useAi) {
    const ai = await meteredAi<{ questions: { prompt: string; lookFor: string[] }[] }>(user, "interview_questions", {
      title: input.title,
      mode: input.mode,
      name: user.name,
    });
    questions = ai.data.questions.slice(0, 5);
  } else {
    questions = pickQuestions(input.mode, 5).map((item) => ({ prompt: item.prompt, lookFor: item.lookFor }));
  }
  if (questions.length === 0) return fail("Add at least one question.");
  const stored: StoredQuestion[] = questions.map((question, index) => ({
    id: `q${index + 1}`,
    prompt: question.prompt,
    lookFor: question.lookFor ?? [],
    answer: "",
    durationSec: 0,
    analysis: null,
    coaching: "",
    alternate: "",
  }));
  const session = await prisma.interviewSession.create({
    data: {
      userId: user.id,
      jobId: input.jobId || null,
      title: input.title.trim() || "Practice session",
      mode: input.mode,
      questions: stringifyJson(stored),
      status: "IN_PROGRESS",
    },
  });
  revalidatePath("/interview");
  return ok({ id: session.id });
}

export async function saveInterviewAnswer(input: { sessionId: string; questionId: string; answer: string; durationSec: number }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "interview_feedback");
  if (gate) return gate;
  const session = await prisma.interviewSession.findFirst({ where: { id: input.sessionId, userId: user.id } });
  if (!session) return fail("Session not found.");
  const questions = parseJson<StoredQuestion[]>(session.questions, []);
  const index = questions.findIndex((question) => question.id === input.questionId);
  if (index < 0) return fail("Question not found.");
  const analysis = analyzeAnswer(input.answer, input.durationSec, questions[index].lookFor);
  const ai = await meteredAi<{ alternate: string; coaching: string }>(user, "interview_feedback", {
    answer: input.answer,
    excerpt: input.answer.slice(0, 180),
    prompt: questions[index].prompt,
  });
  questions[index] = {
    ...questions[index],
    answer: input.answer,
    durationSec: input.durationSec,
    analysis,
    coaching: ai.data.coaching,
    alternate: ai.data.alternate,
  };
  await prisma.interviewSession.update({ where: { id: session.id }, data: { questions: stringifyJson(questions) } });
  revalidatePath(`/interview/${session.id}`);
  return ok({ analysis, coaching: ai.data.coaching, alternate: ai.data.alternate });
}

export async function finishInterview(sessionId: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const session = await prisma.interviewSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return fail("Session not found.");
  const questions = parseJson<StoredQuestion[]>(session.questions, []);
  const answered = questions.filter((question) => question.analysis);
  if (answered.length === 0) return fail("Answer at least one question before finishing.");
  const content = Math.round(answered.reduce((sum, question) => sum + (question.analysis?.content ?? 0), 0) / answered.length);
  const fillers = answered.reduce((sum, question) => sum + (question.analysis?.fillerCount ?? 0), 0);
  const paced = answered.filter((question) => (question.analysis?.wpm ?? 0) > 0);
  const wpm = paced.length ? Math.round(paced.reduce((sum, question) => sum + (question.analysis?.wpm ?? 0), 0) / paced.length) : 0;
  const report = {
    content,
    fillers,
    wpm,
    answered: answered.length,
    total: questions.length,
    summary: content >= 7 ? "The answers carry evidence. Tighten the opening line." : "Lead with the result and one number. The middle can be shorter.",
  };
  await prisma.interviewSession.update({
    where: { id: session.id },
    data: { report: stringifyJson(report), status: "COMPLETE" },
  });
  revalidatePath(`/interview/${session.id}`);
  return ok(report);
}

export async function startNegotiation(input: { title: string; jobId?: string; target: string; floor: string; offer: string; difficulty: string }) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "negotiation_script");
  if (gate) return gate;
  if (!input.target.trim() || !input.floor.trim()) return fail("Set a target and a floor before the conversation.");
  const ai = await meteredAi<{ script: string }>(user, "negotiation_script", {
    name: user.name,
    title: input.title,
    company: input.title,
    target: input.target,
    floor: input.floor,
    offer: input.offer,
  });
  const opening = await meteredAi<{ reply: string }>(user, "negotiation_turn", {
    difficulty: input.difficulty,
    target: input.target,
    offer: input.offer,
    history: [],
  });
  const transcript: TranscriptTurn[] = [{ role: "recruiter", text: opening.data.reply }];
  const session = await prisma.negotiationSession.create({
    data: {
      userId: user.id,
      jobId: input.jobId || null,
      title: input.title.trim() || "Offer conversation",
      target: input.target,
      floor: input.floor,
      offer: input.offer,
      difficulty: input.difficulty || "medium",
      script: ai.data.script,
      transcript: stringifyJson(transcript),
      status: "LIVE",
    },
  });
  revalidatePath("/negotiate");
  return ok({ id: session.id });
}

export async function negotiationTurn(sessionId: string, text: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "negotiation_turn");
  if (gate) return gate;
  const session = await prisma.negotiationSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return fail("Session not found.");
  if (!text.trim()) return fail("Write a reply first.");
  const transcript = parseJson<TranscriptTurn[]>(session.transcript, []);
  transcript.push({ role: "you", text: text.trim() });
  const ai = await meteredAi<{ reply: string }>(user, "negotiation_turn", {
    difficulty: session.difficulty,
    target: session.target,
    offer: session.offer,
    floor: session.floor,
    history: transcript,
  });
  transcript.push({ role: "recruiter", text: ai.data.reply });
  await prisma.negotiationSession.update({ where: { id: session.id }, data: { transcript: stringifyJson(transcript) } });
  revalidatePath(`/negotiate/${session.id}`);
  return ok({ transcript });
}

export async function finishNegotiation(sessionId: string) {
  const user = await actionUser();
  if (!user) return fail("Sign in required");
  const gate = await aiGate(user, "negotiation_report");
  if (gate) return gate;
  const session = await prisma.negotiationSession.findFirst({ where: { id: sessionId, userId: user.id } });
  if (!session) return fail("Session not found.");
  const transcript = parseJson<TranscriptTurn[]>(session.transcript, []);
  const scored = scoreNegotiation(transcript, session.target);
  const ai = await meteredAi<{ summary: string }>(user, "negotiation_report", { target: session.target, overall: scored.overall });
  const report = { ...scored, summary: ai.data.summary };
  await prisma.negotiationSession.update({
    where: { id: session.id },
    data: { report: stringifyJson(report), status: "COMPLETE" },
  });
  revalidatePath(`/negotiate/${session.id}`);
  return ok(report);
}
