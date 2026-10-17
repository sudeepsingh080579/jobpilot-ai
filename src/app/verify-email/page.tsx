import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { AuthShell, primaryButton } from "@/components/auth-shell";
import { redirect } from "next/navigation";
import { resendVerificationAction, verifyEmail } from "@/server/auth-actions";
import { emailMode } from "@/lib/email";
import { prisma } from "@/lib/prisma";

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
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, emailVerified: true } });
    if (user?.emailVerified) redirect("/dashboard");
    // No mailer: we cannot send a link, so do not block the account on it.
    if (user && emailMode() === "console") {
      await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
      redirect("/dashboard");
    }
  }
  return (
    <AuthShell title="Confirm your email" lede="We sent a link to your inbox when you signed up. Click it to confirm your address.">
      {query.sent === "1" ? <p className="mt-6 rounded-2xl bg-teal-soft px-4 py-3 text-sm">We sent a new link. It works for 48 hours; check spam if you do not see it.</p> : null}
      {query.sent === "failed" ? <p className="mt-6 rounded-2xl bg-coral-soft px-4 py-3 text-sm">We could not send the email just now. Please try again in a few minutes.</p> : null}
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
