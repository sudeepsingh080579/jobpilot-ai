import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { resendVerificationAction, verifyEmail } from "@/server/auth-actions";

export const metadata: Metadata = { title: "Confirm your email" };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string; sent?: string }> }) {
  const query = await searchParams;
  if (query.token) {
    const ok = await verifyEmail(query.token);
    return (
      <AuthShell title={ok ? "Email confirmed" : "Link expired"} lede={ok ? "Thanks. Your account is all set." : "That link is invalid or has expired. Sign in and send a new one."}>
        <Link href="/dashboard" className={`${primaryButton} mt-6 inline-flex items-center justify-center`}>Go to my desk</Link>
      </AuthShell>
    );
  }
  const session = await auth();
  return (
    <AuthShell title="Confirm your email" lede="We sent a link to your inbox when you signed up. Click it to confirm your address.">
      {query.sent === "1" ? <p className="mt-6 rounded-2xl bg-teal-soft px-4 py-3 text-sm">A new link is on its way.</p> : null}
      {query.sent === "rate" ? <p className="mt-6 text-sm text-bad">Too many requests. Try again later.</p> : null}
      {session?.user ? (
        <form action={resendVerificationAction} className="mt-6">
          <button className={primaryButton} type="submit">Send a new link</button>
        </form>
      ) : (
        <p className="mt-6 text-sm"><Link className="text-indigo underline" href="/login">Sign in</Link> to send a new link.</p>
      )}
    </AuthShell>
  );
}
