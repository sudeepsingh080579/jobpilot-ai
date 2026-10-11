import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { registerAction } from "@/server/auth-actions";

export const metadata: Metadata = { title: "Start your free trial" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const query = await searchParams;
  return (
    <AuthShell title="Start your free trial" lede="7 days of Pro, no card needed. After that you keep a free plan, or upgrade any time.">
      <form action={registerAction} className="mt-6 space-y-3">
        <label className="block text-sm">
          Name
          <input className="field mt-1" name="name" autoComplete="name" required maxLength={80} />
        </label>
        <label className="block text-sm">
          Email
          <input className="field mt-1" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="block text-sm">
          Password
          <input className="field mt-1" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="accept" required className="mt-1" data-testid="accept-terms" />
          <span>
            I agree to the <Link className="text-indigo underline" href="/terms">Terms</Link> and have read the{" "}
            <Link className="text-indigo underline" href="/privacy">Privacy Policy</Link>.
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" name="marketing" className="mt-1" />
          <span>Send me occasional product tips (optional).</span>
        </label>
        {query.error === "exists" ? <p className="text-sm text-bad">That email already has an account. Sign in instead.</p> : null}
        {query.error === "1" ? <p className="text-sm text-bad">Check your name, email, a password of at least 8 characters, and accept the Terms.</p> : null}
        {query.error === "rate" ? <p className="text-sm text-bad">Too many sign-ups from this network. Try again later.</p> : null}
        <button className={primaryButton} type="submit">
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Already have one? <Link className="text-indigo underline" href="/login">Sign in</Link>
      </p>
    </AuthShell>
  );
}
