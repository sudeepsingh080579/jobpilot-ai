import Link from "next/link";
import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { shouldSeedDemo } from "@/lib/deploy";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { loginAction } from "@/server/auth-actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; reset?: string }> }) {
  const query = await searchParams;
  const demo = shouldSeedDemo(process.env.SEED_DEMO);
  return (
    <AuthShell title="Sign in" lede="Welcome back. Pick up your job search where you left it.">
      <form action={loginAction} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={query.next ?? "/dashboard"} />
        <label className="block text-sm">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="username" required defaultValue={demo ? brand.demoEmail : undefined} data-testid="login-email" />
        </label>
        <label className="block text-sm">
          Password
          <input className="field mt-1" name="password" type="password" autoComplete="current-password" required defaultValue={demo ? brand.demoPassword : undefined} data-testid="login-password" />
        </label>
        {query.error === "1" ? <p className="text-sm text-bad">That email and password did not match.</p> : null}
        {query.error === "rate" ? <p className="text-sm text-bad">Too many attempts. Wait 15 minutes and try again.</p> : null}
        {query.reset ? <p className="text-sm text-good">Password updated. Sign in with the new one.</p> : null}
        <button className={primaryButton} type="submit" data-testid="login-submit">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="text-indigo underline" href="/forgot-password">Forgot your password?</Link>
      </p>
      {demo ? (
        <p className="mt-4 rounded-lg bg-mist px-3 py-2 text-sm text-pine">
          Demo: {brand.demoEmail} · {brand.demoPassword}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        New here? <Link className="text-indigo underline" href="/register">Start your free 7-day trial</Link>
      </p>
    </AuthShell>
  );
}
