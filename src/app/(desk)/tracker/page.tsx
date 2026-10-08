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
        title="Your jobs"
        lede="Drag a card, or use the menu on it. Notes live on the role."
        actions={
          <Link className="inline-flex h-12 items-center rounded-full bg-indigo px-5 font-bold text-white" href="/search">
            Add a role
          </Link>
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
