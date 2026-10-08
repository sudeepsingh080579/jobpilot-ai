import Link from "next/link";
import { CarStudio } from "@/components/rest-ui";
import { PageHeader } from "@/components/shell";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function CarPage() {
  const user = await requireUser();
  const notes = await prisma.carStatement.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader eyebrow="Strategy" title="Experience notes" lede="Turn a program into Challenge, Action, Result, then a bullet, then a master resume." actions={<Link className="text-sm text-pine" href="/strategy">Back to niche</Link>} />
      <CarStudio notes={notes.map((note) => ({ id: note.id, company: note.company, role: note.role, challenge: note.challenge, action: note.action, result: note.result, resumeBullet: note.resumeBullet }))} />
    </div>
  );
}
