import { notFound } from "next/navigation";
import { PitchEditor } from "@/components/practice-ui";
import { PageHeader } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const deck = await prisma.pitchDeck.findFirst({ where: { id, userId: user.id } });
  if (!deck) notFound();
  return (
    <div>
      <PageHeader eyebrow={deck.companyName} title={deck.problem} />
      <PitchEditor deckId={deck.id} initial={parseJson(deck.slides, [])} />
    </div>
  );
}
