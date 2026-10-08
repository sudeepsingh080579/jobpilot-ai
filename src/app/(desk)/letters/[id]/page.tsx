import { notFound } from "next/navigation";
import { LetterEditor } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function LetterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const letter = await prisma.coverLetter.findFirst({ where: { id, userId: user.id } });
  if (!letter) notFound();
  return (
    <div>
      <PageHeader eyebrow="Letter" title={letter.title} />
      <LetterEditor letter={{ id: letter.id, title: letter.title, template: letter.template, content: letter.content }} />
    </div>
  );
}
