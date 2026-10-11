import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { resetPasswordAction } from "@/server/auth-actions";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const query = await searchParams;
  if (!query.token || query.error === "invalid") {
    return (
      <AuthShell title="Link expired" lede="That reset link is invalid or has expired.">
        <p className="mt-6 text-sm"><Link className="text-indigo underline" href="/forgot-password">Send a new link</Link></p>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Choose a new password">
      <form action={resetPasswordAction} className="mt-6 space-y-3">
        <input type="hidden" name="token" value={query.token} />
        <label className="block text-sm">
          New password
          <input className="field mt-1" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        {query.error === "short" ? <p className="text-sm text-bad">Use at least 8 characters.</p> : null}
        {query.error === "rate" ? <p className="text-sm text-bad">Too many attempts. Try again later.</p> : null}
        <button className={primaryButton} type="submit">Save password</button>
      </form>
    </AuthShell>
  );
}
