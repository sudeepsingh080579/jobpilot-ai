import Link from "next/link";
import { DueReminders, SnapshotWriter } from "@/components/pwa";
import { JourneyStepper } from "@/components/journey-chrome";
import { loadJourney } from "@/server/journey";
import { requireUser } from "@/server/session";

export default async function DashboardPage() {
  const user = await requireUser();
  const journey = await loadJourney(user.id);
  const first = user.name.split(" ")[0];
  const next = journey.next;

  return (
    <div className="mx-auto max-w-xl" data-testid="journey-home">
      <SnapshotWriter snapshot={{ name: user.name, next: next?.title ?? "Journey complete", completed: journey.completed }} />
      <DueReminders />
      <p className="text-base font-medium text-muted">Hi {first}</p>
      <h1 className="mt-1 text-4xl font-bold tracking-tight">Let&apos;s take the next step.</h1>
      <div className="mt-6">
        <JourneyStepper steps={journey.steps} />
      </div>
      {next ? (
        <section data-testid="next-step" className="mt-6 rounded-[2rem] bg-gradient-to-br from-indigo to-violet p-6 text-white shadow-lg">
          <p className="text-sm font-bold uppercase tracking-wide text-white">Your next step</p>
          <h2 className="mt-2 text-3xl font-bold leading-tight">{next.title}</h2>
          <p className="mt-3 text-lg leading-7 text-white/90">{next.blurb}</p>
          <Link href={next.href} data-testid="next-step-cta" className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-sun text-lg font-bold text-ink">
            {next.cta}
          </Link>
        </section>
      ) : (
        <section data-testid="next-step" className="mt-6 rounded-[2rem] bg-gradient-to-br from-teal to-indigo p-6 text-white">
          <p className="text-sm font-bold uppercase tracking-wide text-white">All six steps</p>
          <h2 className="mt-2 text-3xl font-bold">You have walked the whole path.</h2>
          <p className="mt-3 text-lg text-white/90">Keep the jobs moving, or open any step again.</p>
          <Link href="/tracker" className="mt-6 flex h-14 w-full items-center justify-center rounded-full bg-sun text-lg font-bold text-ink">
            See your jobs
          </Link>
        </section>
      )}
    </div>
  );
}
