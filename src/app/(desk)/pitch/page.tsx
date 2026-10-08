import Link from "next/link";
import { PitchSetup } from "@/components/rest-ui";
import { PageHeader, EmptyState } from "@/components/shell";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function PitchPage() {
  const user = await requireUser();
  const [companies, decks] = await Promise.all([
    prisma.targetCompany.findMany({ where: { userId: user.id } }),
    prisma.pitchDeck.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } }),
  ]);
  return (
    <div>
      <PageHeader eyebrow="Pitch" title="Decks" lede="Pick one problem you believe the company has. The slides are a short consultant brief you can edit and print." />
      <PitchSetup companies={companies.map((company) => ({ id: company.id, name: company.name, problems: parseJson(company.problems, []) }))} />
      <div className="mt-4 grid gap-3">
        {decks.length === 0 ? <EmptyState title="No deck yet" body="Research a company, pick one problem, and generate the slides." /> : null}
        {decks.map((deck) => (
          <Link key={deck.id} href={`/pitch/${deck.id}`} className="desk-card p-4">
            <p className="font-medium">{deck.companyName}</p>
            <p className="text-sm text-muted">{deck.problem}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
