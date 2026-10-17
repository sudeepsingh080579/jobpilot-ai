import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { forgotPasswordAction } from "@/server/auth-actions";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const query = await searchParams;
  return (
    <AuthShell title="Reset your password" lede="Enter your email and we will send you a reset link.">
      {query.sent ? (
        <p className="mt-6 rounded-2xl bg-teal-soft px-4 py-3 text-sm text-ink">If that email has an account, a reset link is on its way. It works for 1 hour.</p>
      ) : (
        <form action={forgotPasswordAction} className="mt-6 space-y-3">
          <label className="block text-sm">
            Email
            <input className="field mt-1" name="email" type="email" autoComplete="email" required />
          </label>
          {query.error === "nomail" ? <p className="text-sm text-bad">Password reset by email is not available yet. Please contact us via the <Link className="underline" href="/support">Support page</Link>.</p> : null}
          {query.error === "rate" ? <p className="text-sm text-bad">Too many requests. Try again later.</p> : null}
          <button className={primaryButton} type="submit">Send reset link</button>
        </form>
      )}
      <p className="mt-4 text-sm"><Link className="text-indigo underline" href="/login">Back to sign in</Link></p>
    </AuthShell>
  );
}
