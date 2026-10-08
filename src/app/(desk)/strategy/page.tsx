import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { StrategyStudio } from "@/components/strategy-form";
import { parseJson } from "@/lib/json";
import { joinList } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function StrategyPage() {
  const user = await requireUser();
  const [niches, jobCount] = await Promise.all([
    prisma.niche.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } }),
    prisma.job.count({ where: { userId: user.id } }),
  ]);
  const primary = niches.find((niche) => niche.isPrimary) ?? niches[0];
  return (
    <div>
      <PageHeader
        eyebrow="Strategy"
        title="Niche"
        lede="One primary target, with aliases, locations, and the words you want in or out of a description."
        actions={
          <>
            <Link className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" href="/strategy/skills">Skill map</Link>
            <Link className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" href="/strategy/swot">SWOT</Link>
            <Link className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" href="/strategy/car">Experience notes</Link>
          </>
        }
      />
      {niches.length > 1 ? (
        <ul className="mb-4 flex flex-wrap gap-2 text-sm">
          {niches.map((niche) => (
            <li key={niche.id} className="rounded-full bg-paper px-3 py-1">{niche.name}{niche.isPrimary ? " · primary" : ""}</li>
          ))}
        </ul>
      ) : null}
      <StrategyStudio
        hasJobs={jobCount > 0}
        initial={primary ? {
          id: primary.id,
          name: primary.name,
          title: primary.title,
          aliases: joinList(parseJson(primary.aliases, [])),
          industries: joinList(parseJson(primary.industries, [])),
          seniority: primary.seniority,
          roleCategory: primary.roleCategory,
          functionName: primary.functionName,
          companyTypes: joinList(parseJson(primary.companyTypes, [])),
          locations: joinList(parseJson(primary.locations, [])),
          workModes: joinList(parseJson(primary.workModes, [])),
          targetCompanies: joinList(parseJson(primary.targetCompanies, [])),
          includeKeywords: joinList(parseJson(primary.includeKeywords, [])),
          excludeKeywords: joinList(parseJson(primary.excludeKeywords, [])),
          why: primary.why,
          payBenchmark: primary.payBenchmark,
          isPrimary: primary.isPrimary,
        } : null}
      />
    </div>
  );
}
