import Link from "next/link";
import { brand } from "@/lib/brand";
import { Mark } from "@/components/mark";
import { loginAction } from "@/server/auth-actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const query = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 flex items-center gap-3">
        <Mark />
        <span className="font-serif text-2xl">{brand.name}</span>
      </Link>
      <h1 className="font-serif text-4xl">Sign in</h1>
      <p className="mt-2 text-sm text-muted">The demo desk is ready. No third-party account required.</p>
      <form action={loginAction} className="mt-6 space-y-3">
        <label className="block text-sm">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="username" required defaultValue={brand.demoEmail} data-testid="login-email" />
        </label>
        <label className="block text-sm">
          Password
          <input className="field mt-1" name="password" type="password" autoComplete="current-password" required defaultValue={brand.demoPassword} data-testid="login-password" />
        </label>
        {query.error ? <p className="text-sm text-bad">Those credentials did not match. Try the demo pair below.</p> : null}
        <button className="h-14 w-full rounded-full bg-indigo text-base font-bold text-white" type="submit" data-testid="login-submit">
          Sign in
        </button>
      </form>
      <p className="mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-pine">
        Demo: {brand.demoEmail} · {brand.demoPassword}
      </p>
      <p className="mt-4 text-sm text-muted">
        New here? <Link className="text-pine" href="/register">Create an account</Link>
      </p>
    </main>
  );
}
