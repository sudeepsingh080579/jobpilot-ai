import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { isAdmin } from "@/lib/admin";
import { formatInr } from "@/lib/billing/pricing";
import { prisma } from "@/lib/prisma";
import { revokePaymentAction } from "@/server/upi-actions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "UPI payments", robots: { index: false } };
export const dynamic = "force-dynamic";

const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "");

export default async function AdminPaymentsPage() {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();
  const [payments, notes, logs] = await Promise.all([
    prisma.upiPayment.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { email: true, name: true } } } }),
    prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <div className="space-y-6" data-testid="admin-payments">
      <PageHeader eyebrow="Admin" title="UPI payments" />
      <p className="text-sm text-muted">Pro activates instantly on a valid UTR. Check each payment reached your UPI account; revoke any that did not.</p>
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Payments</h2>
        {payments.length === 0 ? <p className="text-sm text-muted">No payments yet.</p> : null}
        {payments.map((p) => (
          <div key={p.id} className="desk-card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="payment-row">
            <div className="text-sm">
              <p className="font-bold">{p.user.name} · {p.user.email} · {formatInr(p.amountPaise)} · <span data-testid="payment-status">{p.status}</span></p>
              <p className="text-muted">UTR {p.utr} · ref {p.ref} · {ist(p.createdAt)}{p.periodEnd && p.status === "auto_activated" ? ` · Pro until ${ist(p.periodEnd)}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
            </div>
            {p.status === "auto_activated" ? (
              <form action={revokePaymentAction} className="flex gap-2">
                <input type="hidden" name="id" value={p.id} />
                <input name="note" placeholder="Reason (e.g. not received)" className="rounded-xl border px-2 text-sm" />
                <button className="h-10 rounded-full border-2 border-coral px-4 font-bold" data-testid="revoke">Revoke</button>
              </form>
            ) : null}
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-bold">Notifications</h2>
        <ul className="mt-2 space-y-2 text-sm" data-testid="notification-feed">
          {notes.map((n) => (
            <li key={n.id} className="desk-card p-3">
              <p className="font-semibold">{n.subject}</p>
              <p className="text-xs text-muted">{ist(n.createdAt)} · to {n.to} · {n.sentVia === "console" ? "not emailed (no mailer configured)" : n.sentVia === "failed" ? `email failed: ${n.error}` : `emailed via ${n.sentVia}`}</p>
              <pre className="mt-1 whitespace-pre-wrap text-xs">{n.body}</pre>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-bold">Audit log</h2>
        <ul className="mt-2 space-y-1 text-xs text-muted">
          {logs.map((l) => <li key={l.id}>{ist(l.createdAt)} · {l.actorEmail} · {l.action} · {l.targetId} · {l.detail}</li>)}
        </ul>
      </section>
    </div>
  );
}
