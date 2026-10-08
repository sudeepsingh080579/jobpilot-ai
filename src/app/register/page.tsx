import Link from "next/link";
import { brand } from "@/lib/brand";
import { Mark } from "@/components/mark";
import { registerAction } from "@/server/auth-actions";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <Mark />
        <span className="font-serif text-2xl">{brand.name}</span>
      </Link>
      <h1 className="font-serif text-4xl">Create your desk</h1>
      <p className="mt-2 text-sm text-muted">Email and a password. Nothing else to connect.</p>
      <form action={registerAction} className="mt-6 space-y-3">
        <label className="block text-sm">
          Name
          <input className="field mt-1" name="name" required />
        </label>
        <label className="block text-sm">
          Email
          <input className="field mt-1" name="email" type="email" required />
        </label>
        <label className="block text-sm">
          Password
          <input className="field mt-1" name="password" type="password" minLength={8} required />
        </label>
        {query.error === "exists" ? <p className="text-sm text-bad">That email already has a desk. Sign in instead.</p> : null}
        {query.error === "1" ? <p className="text-sm text-bad">Check the name, email, and a password of at least 8 characters.</p> : null}
        <button className="h-11 w-full rounded-lg bg-pine text-sm text-cream" type="submit">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have one? <Link className="text-pine" href="/login">Sign in</Link>
      </p>
    </main>
  );
}
