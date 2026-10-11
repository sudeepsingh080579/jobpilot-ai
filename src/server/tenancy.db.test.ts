import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Cross-tenant integration test against a real Postgres. Runs when
 * DATABASE_URL is set (CI, `docker compose up -d`); skipped otherwise.
 * User A is signed in and tries to read or change user B's rows by id.
 */
const hasDb = Boolean(process.env.DATABASE_URL?.startsWith("postgres"));
const session = { current: "" };

vi.mock("@/auth", () => ({ auth: async () => (session.current ? { user: { id: session.current } } : null), signIn: vi.fn(), signOut: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); }, notFound: () => { throw new Error("notFound"); } }));

describe.skipIf(!hasDb)("tenant isolation (database)", async () => {
  const { prisma } = await import("@/lib/prisma");
  const ids = { a: "", b: "", reminder: "", post: "", letter: "", message: "", job: "", contact: "", draft: "" };
  const tag = `iso-${Date.now()}`;

  beforeAll(async () => {
    const a = await prisma.user.create({ data: { email: `${tag}-a@example.com`, name: "A", passwordHash: "x", trialEndsAt: new Date(Date.now() + 86400000) } });
    const b = await prisma.user.create({ data: { email: `${tag}-b@example.com`, name: "B", passwordHash: "x" } });
    ids.a = a.id;
    ids.b = b.id;
    ids.reminder = (await prisma.reminder.create({ data: { userId: b.id, title: "B secret", dueAt: new Date() } })).id;
    ids.post = (await prisma.linkedInPost.create({ data: { userId: b.id, weekOf: "2026-W41", theme: "t", content: "B post" } })).id;
    ids.letter = (await prisma.coverLetter.create({ data: { userId: b.id, title: "B letter", content: "B" } })).id;
    ids.message = (await prisma.chatMessage.create({ data: { userId: b.id, role: "assistant", content: "B chat" } })).id;
    ids.job = (await prisma.job.create({ data: { userId: b.id, title: "B job", company: "B co" } })).id;
    const contact = await prisma.contact.create({ data: { userId: b.id, name: "B contact" } });
    ids.contact = contact.id;
    ids.draft = (await prisma.outreachMessage.create({ data: { contactId: contact.id, step: "PITCH", body: "B draft" } })).id;
    session.current = a.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { startsWith: tag } } });
    await prisma.$disconnect();
  });

  it("A cannot change B's rows through server actions", async () => {
    const account = await import("@/server/account-actions");
    const material = await import("@/server/material-actions");
    const assistant = await import("@/server/assistant-actions");
    const pipeline = await import("@/server/pipeline-actions");

    expect((await account.toggleReminder(ids.reminder, true)).ok).toBe(false);
    expect((await material.savePost(ids.post, "hijack")).ok).toBe(false);
    expect((await material.saveLetter({ id: ids.letter, title: "x", template: "x", content: "hijack" })).ok).toBe(false);
    expect((await assistant.rateMessage(ids.message, 1)).ok).toBe(false);
    expect((await pipeline.markDraftCopied(ids.draft)).ok).toBe(false);

    expect((await prisma.reminder.findUniqueOrThrow({ where: { id: ids.reminder } })).done).toBe(false);
    expect((await prisma.linkedInPost.findUniqueOrThrow({ where: { id: ids.post } })).content).toBe("B post");
    expect((await prisma.coverLetter.findUniqueOrThrow({ where: { id: ids.letter } })).content).toBe("B");
    expect((await prisma.chatMessage.findUniqueOrThrow({ where: { id: ids.message } })).rating).toBeNull();
    expect((await prisma.outreachMessage.findUniqueOrThrow({ where: { id: ids.draft } })).status).toBe("DRAFT");
  });

  it("A's data export contains none of B's rows", async () => {
    const { GET } = await import("@/app/api/account/export/route");
    const response = await GET();
    const text = await response.text();
    expect(response.status).toBe(200);
    expect(text).toContain(`${tag}-a@example.com`);
    for (const secret of ["B secret", "B post", "B letter", "B chat", "B job", "B contact", "B draft", `${tag}-b@example.com`]) {
      expect(text).not.toContain(secret);
    }
    expect(text).not.toContain("passwordHash");
  });

  it("AI usage is metered per user and the Free plan blocks Pro tasks", async () => {
    const { aiGate, meteredAi, aiUsed } = await import("@/server/billing");
    const a = await prisma.user.findUniqueOrThrow({ where: { id: ids.a } });
    const b = await prisma.user.findUniqueOrThrow({ where: { id: ids.b } });
    process.env.LLM_MOCK = "1";
    await meteredAi(a, "chat", { name: "A", message: "hi" });
    expect(await aiUsed(a.id)).toBe(1);
    expect(await aiUsed(b.id)).toBe(0);
    expect(await aiGate(a, "pitch_deck")).toBeNull();
    const blocked = await aiGate(b, "pitch_deck");
    expect(blocked?.ok).toBe(false);
  });

  it("deleting an account removes all of its rows", async () => {
    session.current = ids.b;
    const { deleteAccountAction } = await import("@/server/privacy-actions");
    const form = new FormData();
    form.set("confirm", "DELETE");
    await deleteAccountAction(form);
    expect(await prisma.user.findUnique({ where: { id: ids.b } })).toBeNull();
    expect(await prisma.reminder.count({ where: { userId: ids.b } })).toBe(0);
    expect(await prisma.outreachMessage.count({ where: { id: ids.draft } })).toBe(0);
    session.current = ids.a;
  });
});
