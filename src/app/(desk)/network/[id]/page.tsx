import { notFound } from "next/navigation";
import { Sequence } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function ContactPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const contact = await prisma.contact.findFirst({ where: { id, userId: user.id }, include: { messages: true, company: true } });
  if (!contact) notFound();
  return (
    <div>
      <PageHeader eyebrow={contact.company?.name || "Contact"} title={contact.name} lede={`${contact.title} · ${contact.type}. Copy the draft. Nothing is sent.`} />
      <Sequence contactId={contact.id} messages={contact.messages.map((message) => ({ id: message.id, step: message.step, body: message.body, status: message.status }))} />
    </div>
  );
}
