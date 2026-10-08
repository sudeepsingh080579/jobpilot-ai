import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { SwotButton } from "@/components/swot-button";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function SwotPage() {
  const user = await requireUser();
  const report = await prisma.swotReport.findUnique({ where: { userId: user.id } });
  const blocks = [
    ["Strengths", parseJson<string[]>(report?.strengths, [])],
    ["Weaknesses", parseJson<string[]>(report?.weaknesses, [])],
    ["Opportunities", parseJson<string[]>(report?.opportunities, [])],
    ["Threats", parseJson<string[]>(report?.threats, [])],
  ] as const;
  return (
    <div>
      <PageHeader eyebrow="Strategy" title="SWOT" lede="A plain read of the roles you have saved, plus a short plan. One saved job is enough to start. Five is better." actions={<Link className="text-sm text-pine" href="/strategy">Back to niche</Link>} />
      <SwotButton />
      {!report ? <p className="mt-4 text-sm text-muted">No SWOT yet.</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {blocks.map(([title, items]) => (
          <section key={title} className="desk-card p-4">
            <h2 className="font-serif text-2xl">{title}</h2>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6">{items.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        ))}
      </div>
      {report ? (
        <section className="desk-card mt-3 p-4">
          <h2 className="font-serif text-2xl">Plan of action</h2>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{parseJson<string[]>(report.actions, []).map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      ) : null}
    </div>
  );
}
