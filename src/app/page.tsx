import Link from "next/link";
import { brand } from "@/lib/brand";
import { Mark } from "@/components/mark";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const points = [
  { title: "A niche, not a blast", body: "Name the titles, companies, and keywords worth your time. Score every saved role before you tailor." },
  { title: "Materials you can defend", body: "Three resume templates, an ATS keyword check, cover letters, and a short pitch deck you can edit." },
  { title: "Drafts you send yourself", body: "Outreach, follow-ups, and posts stay on this desk. Nothing is posted or sent for you." },
];

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:py-14">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="font-serif text-2xl">{brand.name}</span>
        </div>
        <Link href="/login" className="text-sm text-pine">
          Sign in
        </Link>
      </header>
      <section className="mt-16 max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-brass">For mid-career and senior searches</p>
        <h1 className="mt-3 font-serif text-5xl leading-[1.05] text-ink sm:text-6xl">{brand.tagline}</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Strategy, a tracker, resume tools, and interview practice for someone who is done spraying applications. Built to be useful on day one for a cloud and DevOps leader working India and US hours.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className="rounded-lg bg-pine px-5 py-3 text-sm text-cream">
            Open the demo desk
          </Link>
          <Link href="/register" className="rounded-lg border border-line bg-paper px-5 py-3 text-sm">
            Create an account
          </Link>
        </div>
      </section>
      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <article key={point.title} className="desk-card p-5">
            <h2 className="font-serif text-2xl">{point.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{point.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
