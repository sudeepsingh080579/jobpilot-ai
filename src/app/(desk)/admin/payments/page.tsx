import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PageHeader } from "@/components/shell";
import { isAdmin } from "@/lib/admin";
import { formatInr } from "@/lib/billing/pricing";
import { prisma } from "@/lib/prisma";
import { approvePaymentAction, rejectPaymentAction } from "@/server/upi-actions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "UPI payments", robots: { index: false } };
export const dynamic = "force-dynamic";

const ist = (d: Date | null) => (d ? d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) + " IST" : "");

export default async function AdminPaymentsPage() {
  const me = await requireUser();
  if (!isAdmin(me.email)) notFound();
  const [pending, recent, logs] = await Promise.all([
    prisma.upiPayment.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, include: { user: { select: { email: true, name: true } } } }),
    prisma.upiPayment.findMany({ where: { status: { not: "pending" } }, orderBy: { reviewedAt: "desc" }, take: 30, include: { user: { select: { email: true } } } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return (
    <div className="space-y-6" data-testid="admin-payments">
      <PageHeader eyebrow="Admin" title="UPI payments" />
      <section className="space-y-3">
        <h2 className="text-lg font-bold">Pending verification ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-sm text-muted">Nothing to review.</p> : null}
        {pending.map((p) => (
          <div key={p.id} className="desk-card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="pending-payment">
            <div className="text-sm">
              <p className="font-bold">{p.user.email} · {formatInr(p.amountPaise)}</p>
              <p className="text-muted">UTR <span data-testid="pending-utr">{p.utr}</span> · ref {p.ref} · {ist(p.createdAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <form action={approvePaymentAction}><input type="hidden" name="id" value={p.id} /><button className="h-10 rounded-full bg-teal px-4 font-bold text-white" data-testid="approve">Approve</button></form>
              <form action={rejectPaymentAction} className="flex gap-2"><input type="hidden" name="id" value={p.id} /><input name="note" placeholder="Reason" className="rounded-xl border px-2 text-sm" /><button className="h-10 rounded-full border-2 border-coral px-4 font-bold">Reject</button></form>
            </div>
          </div>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-bold">Recently reviewed</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {recent.map((p) => <li key={p.id}>{p.status.toUpperCase()} · {p.user.email} · UTR {p.utr} · by {p.reviewedBy} · {ist(p.reviewedAt)}{p.periodEnd ? ` · Pro until ${ist(p.periodEnd)}` : ""}{p.note ? ` · ${p.note}` : ""}</li>)}
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
