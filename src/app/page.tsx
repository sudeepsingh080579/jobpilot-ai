import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo via-violet to-indigo-deep px-6">
      <div className="max-w-xl text-center">
        <h1 data-testid="landing-headline" className="text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl">
          One clear next step for your job search.
        </h1>
        <Link
          href="/login"
          data-testid="landing-signin"
          className="mt-10 inline-flex h-14 items-center justify-center rounded-full bg-sun px-10 text-lg font-bold text-ink"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
