import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function PrintLetterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const letter = await prisma.coverLetter.findFirst({ where: { id, userId: user.id } });
  if (!letter) notFound();
  return (
    <article>
      <PrintButton />
      <h1 className="font-serif text-3xl">{letter.title}</h1>
      <p className="mt-6 whitespace-pre-wrap text-sm leading-7">{letter.content}</p>
    </article>
  );
}
