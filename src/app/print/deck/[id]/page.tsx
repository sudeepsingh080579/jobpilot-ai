import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function PrintDeckPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const deck = await prisma.pitchDeck.findFirst({ where: { id, userId: user.id } });
  if (!deck) notFound();
  const slides = parseJson<{ kicker: string; title: string; body: string; bullets: string[] }[]>(deck.slides, []);
  return (
    <div>
      <PrintButton />
      {slides.map((slide, index) => (
        <section key={slide.title} className="mb-8 break-after-page border-t-4 border-pine pt-6">
          <p className="text-xs uppercase tracking-[0.16em] text-brass">{index + 1} · {slide.kicker}</p>
          <h2 className="mt-2 font-serif text-4xl">{slide.title}</h2>
          <p className="mt-3 text-sm leading-6">{slide.body}</p>
          <ul className="mt-3 list-disc pl-5 text-sm">{slide.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
        </section>
      ))}
    </div>
  );
}
