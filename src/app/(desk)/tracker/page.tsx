import Link from "next/link";
import { PageHeader } from "@/components/shell";
import { TrackerBoard } from "@/components/tracker-board";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";

export default async function TrackerPage() {
  const user = await requireUser();
  const jobs = await prisma.job.findMany({ where: { userId: user.id, archived: false }, orderBy: { updatedAt: "desc" } });
  return (
    <div>
      <PageHeader
        eyebrow="Pipeline"
        title="Tracker"
        lede="Saved through rejected. Drag a card or use the table. Notes and drafts live on the role."
        actions={
          <>
            <Link className="rounded-lg border border-line bg-paper px-3 py-2 text-sm" href="/analytics">Funnel</Link>
            <Link className="rounded-lg bg-pine px-3 py-2 text-sm text-cream" href="/search">Add a role</Link>
          </>
        }
      />
      <TrackerBoard
        jobs={jobs.map((job) => ({
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location,
          status: job.status,
          fitScore: job.fitScore,
          fitBand: job.fitBand,
          workMode: job.workMode,
        }))}
      />
    </div>
  );
}
