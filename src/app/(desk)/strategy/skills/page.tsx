import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { SkillRefresh } from "@/components/skill-refresh";
import { parseJson } from "@/lib/json";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function SkillsPage() {
  const user = await requireUser();
  const skills = await prisma.skill.findMany({ where: { userId: user.id }, orderBy: { category: "asc" } });
  const groups = ["technical", "tool", "soft"];
  return (
    <div>
      <PageHeader eyebrow="Strategy" title="Skill map" lede="Reverse-engineered from the roles on your desk, with the names a posting might use instead." actions={<Link className="text-sm text-pine" href="/strategy">Back to niche</Link>} />
      <SkillRefresh />
      {skills.length === 0 ? <p className="mt-4 text-sm text-muted">No skills yet. Refresh the map after you have saved a few roles.</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {groups.map((group) => (
          <section key={group} className="desk-card p-4">
            <h2 className="text-xs uppercase tracking-[0.14em] text-brass">{group}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {skills.filter((skill) => skill.category === group).map((skill) => (
                <li key={skill.id}>
                  <p className="font-medium">{skill.name}</p>
                  <p className="text-muted">{parseJson<string[]>(skill.variants, []).join(" · ")}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
